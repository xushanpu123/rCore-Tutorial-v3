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

让传入的地址落在分配的用户地址上，但是还是不行，检查了qemu.log发现它跑飞了：

```

```

