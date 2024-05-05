## 基于polyhal的rcore tutorial ch2

1、迁移ch1的工作。

2、polyhal已经实现了中断处理的预处理和后处理过程，也就是说，只需要编写真正的trap_handle即可，增加一个#[polyhal::arch_interrupt]宏再用polyhal的接口编写系统调用和pagefault以及IllegalInstruction相关实现即可。

```rust
/// kernel interrupt
#[polyhal::arch_interrupt]
fn kernel_interrupt(ctx: &mut TrapFrame, trap_type: TrapType) {
    // println!("trap_type @ {:x?} {:#x?}", trap_type, ctx);
    match trap_type {
        UserEnvCall => {
            // jump to next instruction anyway
            ctx.syscall_ok();
            let args = ctx.args();
            let result = syscall(ctx[TrapFrameArgs::SYSCALL], [args[0], args[1], args[2]]);
            ctx[TrapFrameArgs::RET] = result as usize;
        }
        StorePageFault(_paddr) | LoadPageFault(_paddr) | InstructionPageFault(_paddr) => {
            println!("[kernel] PageFault in application, kernel killed it.");
            run_next_app();
        }
        IllegalInstruction(_) => {
            println!("[kernel] IllegalInstruction in application, kernel killed it.");
            run_next_app();
        }
        _ => {
            panic!("unsuspended trap type: {:?}", trap_type);
        }
    }
}
```

3、这个工作最难的点其实在于实现run_next_app接口，原本的ch2实现方式为将新的task的用户态的TrapContext直接推入栈中模拟中断返回时的状态然后直接利用_restore获取task执行的参数和返回用户态，但是由于使用了polyhal所以整个trap的保护和恢复过程都被封装起来了，我们能编写的只是中断处理的过程，所以无法使用原ch2的方案了：

这里利用了polyhal的内置接口run_user_task来：

```rust
   // before this we have to drop local variables related to resources manually
    // and release the resources
    let mut trap_cx = TrapFrame::new();
    trap_cx[TrapFrameArgs::SEPC] = APP_BASE_ADDRESS;
    trap_cx[TrapFrameArgs::SP] = USER_STACK.get_sp() - VIRT_ADDR_START + 0x100000000;
    let ctx_mut = unsafe { (&mut trap_cx as *mut TrapFrame).as_mut().unwrap() };
    run_user_task(ctx_mut);
```



4、出现了本实验最严重的bug，地址相关的bug，造成的原因为：

​     原本的rcore_tutorial的ch2是没有开虚拟内存和页保护机制的，因此用户程序可以随便访问物理内存不会出现权限问题，因此ch2只需要将程序硬编码到内存某一段空间，并开一个数组当作内核栈，再将sepc和sp指向对应位置就可以了。但是由于polyhal已经默认开启了页表机制，所以用户程序使用的其实已经是虚拟地址了并且存在权限保护，程序无访问权限，因此疯狂报错：

```shell
[kernel] PageFault in application, kernel killed it. paddr=804001f2
```

​	由于ch2还不支持页帧分配，所以无法映射用户地址空间，因此只能想办法去改polyhal，做了以下几个尝试：

找到建立页表的位置增加了一些用户态可以访问的页：

```rust
pub(crate) static mut PAGE_TABLE: [PTE; PageTable::PTE_NUM_IN_PAGE] = {
    let mut arr: [PTE; PageTable::PTE_NUM_IN_PAGE] = [PTE(0); PageTable::PTE_NUM_IN_PAGE];
    // 初始化页表信息
    // 0x00000000_80000000 -> 0x80000000 (1G)
    // 高半核
    // 0xffffffc0_00000000 -> 0x00000000 (1G)
    // 0xffffffc0_80000000 -> 0x80000000 (1G)

    // arr[0] = PTE::from_addr(0x0000_0000, PTEFlags::VRWX);
    // arr[1] = PTE::from_addr(0x4000_0000, PTEFlags::VRWX);
    arr[2] = PTE::from_addr(0x8000_0000, PTEFlags::ADVRWX);
    arr[6] = PTE::from_addr(0x8000_0000, PTEFlags::ADUVRWX);
    arr[0x100] = PTE::from_addr(0x0000_0000, PTEFlags::ADGVRWX);
    arr[0x101] = PTE::from_addr(0x4000_0000, PTEFlags::ADGVRWX);
    arr[0x102] = PTE::from_addr(0x8000_0000, PTEFlags::ADGVRWX);
    arr[0x106] = PTE::from_addr(0x8000_0000, PTEFlags::ADVRWX);
    arr
};
```

然后修改sp和sepc的值使用户程序可以跑在这些地址上：

```rust
const APP_BASE_ADDRESS: usize = 0x180400000 ;
trap_cx[TrapFrameArgs::SEPC] = APP_BASE_ADDRESS;
trap_cx[TrapFrameArgs::SP] = USER_STACK.get_sp() - VIRT_ADDR_START + 0x100000000;
```

让传入的地址落在分配的用户地址上，但是还是不行，检查了qemu.log发现它跑飞了



但是依然会出问题，原因是application会自动编码到0x80400000处，因此所有的函数进行jarl跳转的时候都是基于这个地址来做的，即使把APP_BASE_ADDRESS硬编码成0x180400000，里面函数调用的跳转地址还是不会变(0x804xxxxx)，所以会出现pagefault。

所以引入了页帧分配，并将0x80400000所在的页分配给用户使用，因此需要写frame_allocater，并且做了页表映射：

```rust
        let mut page_table = PageTable::current();
        let vpn = VirtPage::from_addr(APP_BASE_ADDRESS);
        let p_tracker = frame_alloc().expect("can't allocate frame");
        page_table.map_page(vpn, p_tracker.ppn,(MapPermission::U| MapPermission::R|MapPermission::W|MapPermission::X).into(), MappingSize::Page4KB);
```

同时需要初始化堆和页帧分配器：

```rust
    init_heap();
    logging::init(Some("trace"));
    polyhal::init(&PageAllocImpl);
```

但是做完后产生了新的bug：

```shell
[ERROR] src/lang_items.rs:8 [kernel] Panicked at src/batch.rs:107 can't allocate frame
```

原来是页帧分配器没有被设置好，于是重新给分配了可用的物理页：

```rust
    get_mem_areas().into_iter().for_each(|(start, size)| {
        info!("frame alloocator add frame {:#x} - {:#x}", start, start + size);
        init_frame_allocator(start, start + size);
    });
```

另外，之前的页面分配数量不大够，同时还要考虑给堆栈分配用户可用的地址空间，因此对它俩做了分配：

```rust
        let page_table = PageTable::current();
        for i in 0..0x20 {
            page_table.map_page(VirtPage::from_addr(APP_BASE_ADDRESS + PAGE_SIZE * i), frame_alloc_persist().expect("can't allocate frame"), MappingFlags::URWX, MappingSize::Page4KB);
        }
        page_table.map_page(VirtPage::from_addr(0x1_8000_0000), frame_alloc_persist().expect("can't allocate frame"), MappingFlags::URWX, MappingSize::Page4KB);
```

最后用这些参数来返回用户态：

```rust
    let mut trap_cx = TrapFrame::new();
    trap_cx[TrapFrameArgs::SEPC] = APP_BASE_ADDRESS;
    trap_cx[TrapFrameArgs::SP] = 0x1_8000_0000 + PAGE_SIZE;
    let ctx_mut = unsafe { (&mut trap_cx as *mut TrapFrame).as_mut().unwrap() };
    loop {
        run_user_task(ctx_mut);
    }
```

至此，riscv下的ch2就完成了。

接下来需要支持其它架构:x86_64,aarch64,loongarch64。

先修改TARGET有关的Makefile：

```makefile
# Building
TARGET := riscv64gc-unknown-none-elf
ARCH := riscv64
ifeq ($(ARCH), x86_64)
  TARGET := x86_64-unknown-none
  QEMU_EXEC += qemu-system-x86_64 \
				-machine q35 \
				-kernel $(KERNEL_ELF) \
				-cpu IvyBridge-v2
  BUS := pci
else ifeq ($(ARCH), riscv64)
  TARGET := riscv64gc-unknown-none-elf
  QEMU_EXEC += qemu-system-$(ARCH) \
				-machine virt \
				-kernel $(KERNEL_BIN)
else ifeq ($(ARCH), aarch64)
  TARGET := aarch64-unknown-none-softfloat
  QEMU_EXEC += qemu-system-$(ARCH) \
				-cpu cortex-a72 \
				-machine virt \
				-kernel $(KERNEL_BIN)
else ifeq ($(ARCH), loongarch64)
  TARGET := loongarch64-unknown-none
  QEMU_EXEC += qemu-system-$(ARCH) -kernel $(KERNEL_ELF    let mut trap_cx = TrapFrame::new();
    trap_cx[TrapFrameArgs::SEPC] = APP_BASE_ADDRESS;
    trap_cx[TrapFrameArgs::SP] = 0x1_8000_0000 + PAGE_SIZE;
    let ctx_mut = unsafe { (&mut trap_cx as *mut TrapFrame).as_mut().unwrap() };
    loop {
        run_user_task(ctx_mut);
    }
  BUS := pci
else
  $(error "ARCH" must be one of "x86_64", "riscv64", "aarch64" or "loongarch64")
endif
```

修改os和user下的.cargo/cargo文件：

```toml
[build]
target = "riscv64gc-unknown-none-elf"

[target.riscv64gc-unknown-none-elf]
rustflags = [
    "-Clink-args=-Tsrc/linker-riscv64.ld",
	"-Cforce-frame-pointers=yes"
]

[target.x86_64-unknown-none]
rustflags = [
    "-Clink-arg=-Tsrc/linker-x86_64.ld",
	'-Clink-arg=-no-pie',
    "-Cforce-frame-pointers=yes"
]

[target.aarch64-unknown-none-softfloat]
rustflags = [
    "-Clink-arg=-Tsrc/linker-aarch64.ld",
    "-Cforce-frame-pointers=yes"
]

[target.loongarch64-unknown-none]
rustflags = [
    "-Clink-arg=-Tsrc/linker-loongarch64.ld",
    "-Cforce-frame-pointers=yes"
]
```

由于各架构进行系统调用的汇编指令不太一样，因此需要依据各架构来分别给出：

```rust
#[cfg(target_arch = "riscv64")]
fn syscall(id: usize, args: [usize; 3]) -> isize {
    let mut ret: isize;
    unsafe {
        asm!(
            "ecall",
            inlateout("x10") args[0] => ret,
            in("x11") args[1],
            in("x12") args[2],
            in("x17") id
        );
    }
    ret
}

#[cfg(target_arch = "aarch64")]
fn syscall(id: usize, args: [usize; 3]) -> isize {
    let mut ret: isize;
    unsafe {
        asm!(
            "svc #0",
            inlateout("x0") args[0] => ret,
            in("x1") args[1],
            in("x2") args[2],
            in("x8") id
        );
    }
    ret
}

#[cfg(target_arch = "x86_64")]
fn syscall(id: usize, args: [usize; 3]) -> isize {
    let mut ret: isize;
    unsafe {
        asm!(
            "
                push r11
                push rcx
                syscall
                pop  rcx
                pop  r11'-Clink-arg=-no-pie'
            ",
            in("rdi") args[0],
            in("rsi") args[1],
            in("rdx") args[2],
            inlateout("rax") id => ret
        );
    }
    ret
}

#[cfg(target_arch = "loongarch64")]
fn syscall(id: usize, args: [usize; 3]) -> isize {
    let mut ret: isize;
    unsafe {
        asm!(
            "syscall 0",
            inlateout("$r4") args[0] => ret,
            in("$r5") args[1],
            in("$r6") args[2],
            in("$r11") id
        );
    }
    ret
}
```

在给不同的架构编译好的程序给定不同的路径目录后，需要在os/build.rs中也根据不同的架构给出不同的路径：

```rust
	let target=env::var("TARGET").unwrap();
	    writeln!(f, r#"    .quad app_{}_end"#, apps.len() - 1)?;
    for (idx, app) in apps.iter().enumerate() {
        println!("app_{}: {}", idx, app);
        writeln!(
            f,
            r#"
    .section .data
    .global app_{0}_start
    .global app_{0}_end
app_{0}_start:
    .incbin "../user/target/{2}/release/{1}.bin"
app_{0}_end:"#,
            idx, app, target
        )?;
    }
```

user编译的时候必须关闭动态链接，因为rcore tutorial不支持动态链接：

```
[target.x86_64-unknown-none]
rustflags = [
    "-Clink-arg=-Tsrc/linker-x86_64.ld",
	'-Clink-arg=-no-pie',
    "-Cforce-frame-pointers=yes"
]
```

加入'-Clink-arg=-no-pie'即可。