## 基于polyhal支持rcore tutorial

为了实现这个过程，首先需要分析polyhal本身实现了哪些功能，rcore tutorial的哪些功能是可以完全被polyhal代替的。

polyhal是一个主要由rust编写的硬件抽象层，支持4种不同的架构riscv64、x86_64,aarch64和loongarch64,它将所有与架构有关的操作都封装成了上层可用的统一接口，编写操作系统时只需要调用这些统一接口即可，并不需要关注底层的具体架构，polyhal会把这些调用转换为针对不同架构的具体操作，从而实现上层使用时的“硬件无关”。

下面将具体分析一下在rcore tutorial中使用的polyhal提供的主要抽象功能：

**内核入口设置**

编译内核的时候，内核的入口由链接文件指定，在原本的rcore tutorial中，需要依据entey.asm文件给内核分配栈空间和设置入口：

```asm
    .section .text.entry
    .globl _start
_start:
    la sp, boot_stack_top
    call rust_main

    .section .bss.stack
    .globl boot_stack_lower_bound
boot_stack_lower_bound:
    .space 4096 * 16
    .globl boot_stack_top
boot_stack_top:
```

而在使用polyhal之后，这些工作均可    }
}由polyhal完成，只需要在入口函数处加上属性标志\#[polyhal::arch_entry]即可：

```rust
#[polyhal::arch_entry]中断相关的设置
pub fn rust_main(_hartid: usize) -> ! {
...
}
```

通过这种方式，polyhal会完成内核的一切准备工作直接进入内核正文。与此同时，原本需要进行的各段初始化（如bss段清空）的工作也将自动由polyhal完成，rust_main函数直接写内核功能即可。



**中断相关的设计**

polyhal会用\#[polyhal::arch_interrupt]属性标记中断处理函数

```rust
#[polyhal::arch_interrupt]
fn kernel_interrupt(ctx: &mut TrapFrame, trap_type: TrapType) {
...
}
```

只需要在kernel_interrupt中写入各种TrapType对应的中断处理过程即可，中断的各种init()工作都会自动设置好。在此情况下，时钟中断也会自动打开。对时钟相关的参数调用需要使用polyhal::time::Time:

```rust
use polyhal::time::Time;
/// read the `mtime` register
pub fn get_time() -> usize {
        Time::now().to_msec()/MSEC_PER_SEC
}
/// get current time in milliseconds
pub fn get_time_ms() -> usize {
    Time::now().to_msec() 
}
```



当采用#[polyhal::arch_interrupt]特性时，中断的保存上下文和恢复上下文过程都会由polyhal自动完成，kernel_interrupt中只保留了真正的中断处理部分的内容。对于内核态的程序而言，如果想要恢复到用户态，需要借助接口run_user_task()

```rust
pub fn run_user_task(cx: &mut TrapFrame) -> Option<()>
```

该接口传入Trapframe类型作为参数，可以从内核态中依据传入的TrapFrame返回到对应的用户态：

```rust
    let mut trap_cx = TrapFrame::new();
    trap_cx[TrapFrameArgs::SEPC] = APP_BASE_ADDRESS;
    trap_cx[TrapFrameArgs::SP] = USER_STACK.get_sp() - VIRT_ADDR_START + 0x100000000;
    let ctx_mut = unsafe { (&mut trap_cx as *mut TrapFrame).as_mut().unwrap() };
    run_user_task(ctx_mut);
```

**地址空间相关的设置**

polyhal中对页表结构和地址空间进行了严格的抽象，可以适用于各种不同的地址结构

```rust
use polyhal::{PAGE_SIZE, VIRT_ADDR_START};
use polyhal::addr::{PhysAddr, PhysPage};
use polyhal::pagetable::{MappingFlags, MappingSize, PageTable, PageTableWrapper};
use polyhal::addr::{VirtAddr, VirtPage};
```

对于虚拟地址结构、物理地址结构、虚拟页和物理页及其相关的标志位等都在polyhal中封装好了定义，在操作系统进行内存管理的代码中只需要调用这些接口就可以完成对不同架构下的页式管理系统的兼容了。这里需要注意一下变量VIRT_ADDR_START:

```
pub const VIRT_ADDR_START: usize = 0xffff_ffc0_0000_0000;  //riscv64
pub const VIRT_ADDR_START: usize = 0x9000_0000_0000_0000;  //loongarch64
pub const VIRT_ADDR_START: usize = 0xffff_ff80_0000_0000;  //aarch64
pub const VIRT_ADDR_START: usize = 0xffff_ff80_0000_0000;  //x86_64
```

它体现了polyhal高半核的设计，也就是说只有当虚拟地址大于VIRT_ADDR_START这个地址才是可用的。一旦引用了#[polyhal::arch_entry]来作为内核起点，页机制、各种中断、高半核机制等都会自动启动，这些特点给我们的移植过程带来了不少麻烦：

首先，在ch2中，我们需要直接给出各个APP的装入地址APP_BASE_ADDRESS，此时原实验并没有开启虚拟页机制，但是由于polyhal已经自然开启了页机制，因此此时我们作为用户态直接访问APP_BASE_ADDRESS和用户堆栈就会出现pagefault，因此，需要提前对它进行页帧分配：

```rust
        let page_table = PageTable::current();
        for i in 0..0x20 {
            page_table.map_page(VirtPage::from_addr(APP_BASE_ADDRESS + PAGE_SIZE * i), frame_alloc_persist().expect("can't allocate frame"), MappingFlags::URWX, MappingSize::Page4KB);
        }
        page_table.map_page(VirtPage::from_addr(0x1_8000_0000), frame_alloc_persist().expect("can't allocate frame"), MappingFlags::URWX, MappingSize::Page4KB);
```

在ch3中也有类似的工作。

然后是高半核设计的问题，在ch9中，我们需要把I/O端口的物理地址映射到虚拟地址中，原本没有考虑高半核的设计就无法满足要求，因此需要对其进行改变：

```rust
impl Hal for VirtioHal {

    fn phys_to_virt(addr: usize) -> usize {
        addr + VIRT_ADDR_START
    }

    fn virt_to_phys(vaddr: usize) -> usize {
        vaddr - VIRT_ADDR_START
    }
}

```

rcore tutorial中使用的地址相关的自定义结构为PhysPageNum、VirtPageNum，需要全部修改为polyhal::PhysPage和polyhal::VirtPage，因此需要对os/src/mm目录下的文件进行大幅度的改动。



**对于除riscv64外的其它架构的支持**

​	polyhal提供的接口本来就是架构无关的，为了实现对多架构的支持我们需要将自己编写的内核和应用也用对应架构的编译器进行编译和执行，首先在.cargo/config.toml中设置了对不同架构使用的链接设置：

```toml
[build]
target = "riscv64gc-unknown-none-elf"
# target = 'aarch64-unknown-none-softfloat'
# target = 'x86_64-unknown-none'
# target = 'loongarch64-unknown-none'

[target.riscv64gc-unknown-none-elf]
rustflags = [
    "-Clink-arg=-Tsrc/linker-riscv64.ld",
    "-Cforce-frame-pointers=yes",
    '--cfg=board="qemu"',
]

[target.x86_64-unknown-none]
rustflags = [
    "-Clink-arg=-Tsrc/linker-x86_64.ld",
    "-Cforce-frame-pointers=yes",
    '-Clink-arg=-no-pie',
    '--cfg=board="qemu"',
]

[target.aarch64-unknown-none-softfloat]
rustflags = [
    "-Clink-arg=-Tsrc/linker-aarch64.ld",
    "-Cforce-frame-pointers=yes",
    '--cfg=board="qemu"',
]

[target.loongarch64-unknown-none]
rustflags = [
    "-Clink-arg=-Tsrc/linker-loongarch64.ld",
    "-Cforce-frame-pointers=yes",
    '--cfg=board="qemu"',
]

```

这里尤其需要注意的是对x86_64架构设置中的'-Clink-arg=-no-pie'字段，如果缺少了这个字段，x86_64编译器自动默认为使用动态链接的方式，而rcore tutorial暂时未支持动态链接，因此会出现错误。

接下来需要修改os/Makefile和user/Makefile文件：

```makefile
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
				-device virtio-blk-device,drive=x0,bus=virtio-mmio-bus.0 \
				-kernel $(KERNEL_BIN)
else ifeq ($(ARCH), aarch64)
  TARGET := aarch64-unknown-none-softfloat
  QEMU_EXEC += qemu-system-$(ARCH) \
				-cpu cortex-a72 \
				-machine virt \
				-device virtio-blk-device,drive=x0,bus=virtio-mmio-bus.0 \
				-kernel $(KERNEL_BIN)
else ifeq ($(ARCH), loongarch64)
  TARGET := loongarch64-unknown-none
  QEMU_EXEC += qemu-system-$(ARCH) -kernel $(KERNEL_ELF)
  BUS := pci
else
  $(error "ARCH" must be one of "x86_64", "riscv64", "aarch64" or "loongarch64")
endif
```

在设计的时候依据不同架构给出不同的TARGET字段，最后执行编译时使用该TARGET来编译即可：

```makefile
fs-img: $(APPS)
	@cd ../user && make build TARGET=$(TARGET) TEST=$(TEST)
	@rm -f $(FS_IMG)
	@cargo install easyfs-packer && easyfs-packer -s ../user/src/bin/ -t ../user/target/$(TARGET)/release/
	cp ../user/target/$(TARGET)/$(MODE)/fs.img fs-img.img

```

目前还有ch5，ch8，ch9未完成多架构支持，其中ch5，ch8比较简单，ch9部分可能涉及到对中断控制器的多架构修改，完成后将在这里继续记录。