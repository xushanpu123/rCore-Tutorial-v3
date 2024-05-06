//! RISC-V timer-related functionality

use crate::config::CLOCK_FREQ;
use riscv::register::time;

#[allow(unused)]
const TICKS_PER_SEC: usize = 100;
const MSEC_PER_SEC: usize = 1000;

#[allow(unused)]
///get current time
pub fn get_time() -> usize {
    time::read()
}
/// get current time in microseconds
pub fn get_time_ms() -> usize {
    time::read() / (CLOCK_FREQ / MSEC_PER_SEC)
}
