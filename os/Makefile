
TARGET = riscv64gc-unknown-none-elf
MODE := release
KERNEL_ELF := target/$(TARGET)/$(MODE)/os
KERNEL_BIN := $(KERNEL_ELF).bin
DISASM_TMP := target/$(TARGET)/$(MODE)/asm
FS_IMG := ../user/target/$(TARGET)/$(MODE)/fs.img
# FS_IMG := fs-img.img
APPS := ../user/src/bin/*

# BOARD
BOARD := qemu
SBI ?= rustsbi
BOOTLOADER := ../bootloader/$(SBI)-$(BOARD).bin

# Building mode argument
ifeq ($(MODE), release)
	MODE_ARG := --release
endif

# Binutils
OBJDUMP := rust-objdump --arch-name=riscv64
OBJCOPY := rust-objcopy --binary-architecture=riscv64

# Disassembly
DISASM ?= -x

# Run usertests or usershell
TEST ?=

build: env fs-img $(KERNEL_BIN) 

env:
	(rustup target list | grep "$(TARGET) (installed)") || rustup target add $(TARGET)
	cargo install cargo-binutils
	rustup component add rust-src
	rustup component add llvm-tools-preview

$(KERNEL_BIN): kernel
	@$(OBJCOPY) $(KERNEL_ELF) --strip-all -O binary $@

fs-img: $(APPS)
	@cd ../user && make build TARGET=$(TARGET) TEST=$(TEST)
	@rm -f $(FS_IMG)
	@cargo install easyfs-packer && easyfs-packer -s ../user/src/bin/ -t ../user/target/$(TARGET)/release/
	cp ../user/target/$(TARGET)/$(MODE)/fs.img fs-img.img

$(APPS):

kernel:
	@echo Platform: $(BOARD)
	@cargo build -Z build-std --release --target $(TARGET)

clean:
	@cargo clean

disasm: kernel
	@$(OBJDUMP) $(DISASM) $(KERNEL_ELF) | less

disasm-vim: kernel
	@$(OBJDUMP) $(DISASM) $(KERNEL_ELF) > $(DISASM_TMP)
	@vim $(DISASM_TMP)
	@rm $(DISASM_TMP)

run: run-inner

QEMU_EXEC += qemu-system-riscv64 \
			-machine virt \
			-device virtio-blk-device,drive=x0,bus=virtio-mmio-bus.0 \
			-kernel $(KERNEL_BIN) \
			-nographic \
			-drive file=$(FS_IMG),if=none,format=raw,id=x0 \
			-smp 1 \
			-D qemu.log -d in_asm,int,pcall,cpu_reset,guest_errors

run-inner: build
	@echo $(QEMU_EXEC)
	$(QEMU_EXEC)

debug: build
	@tmux new-session -d \
		"$(QEMU_EXEC) -s -S" && \
		tmux split-window -h "gdb -ex 'file $(KERNEL_ELF)' -ex 'target remote localhost:1234'" && \
		tmux -2 attach-session -d


gdbserver: build
	@$(QEMU_EXEC) -s -S

gdbclient:
	@gdb -ex 'file $(KERNEL_ELF)' -ex 'set arch riscv:rv64' -ex 'target remote localhost:1234'

.PHONY: build env kernel clean disasm disasm-vim run-inner fs-img gdbserver gdbclient
