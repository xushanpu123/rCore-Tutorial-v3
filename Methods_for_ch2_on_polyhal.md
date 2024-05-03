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

3、这个工作最难的点其实在于实现run_next_app接口，原本的ch2实现方式为将新的task的用户态的TrapContext直接推入栈中模拟中断返回时的状态然后直接利用_restore获取task执行的参数和返回用户态，但是由于使用了polyhal所以整个trap的保护和恢复过程都被封装起来了，我们能编写的只是中断处理的过程，所以无法使用原ch2的方案了