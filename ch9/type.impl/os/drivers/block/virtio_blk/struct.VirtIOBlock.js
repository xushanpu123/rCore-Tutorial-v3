(function() {var type_impls = {
"os":[["<details class=\"toggle implementors-toggle\" open><summary><section id=\"impl-VirtIOBlock\" class=\"impl\"><a class=\"src rightside\" href=\"src/os/drivers/block/virtio_blk.rs.html#70-88\">source</a><a href=\"#impl-VirtIOBlock\" class=\"anchor\">§</a><h3 class=\"code-header\">impl <a class=\"struct\" href=\"os/drivers/block/virtio_blk/struct.VirtIOBlock.html\" title=\"struct os::drivers::block::virtio_blk::VirtIOBlock\">VirtIOBlock</a></h3></section></summary><div class=\"impl-items\"><section id=\"method.new\" class=\"method\"><a class=\"src rightside\" href=\"src/os/drivers/block/virtio_blk.rs.html#71-87\">source</a><h4 class=\"code-header\">pub fn <a href=\"os/drivers/block/virtio_blk/struct.VirtIOBlock.html#tymethod.new\" class=\"fn\">new</a>() -&gt; Self</h4></section></div></details>",0,"os::board::BlockDeviceImpl"],["<details class=\"toggle implementors-toggle\" open><summary><section id=\"impl-BlockDevice-for-VirtIOBlock\" class=\"impl\"><a class=\"src rightside\" href=\"src/os/drivers/block/virtio_blk.rs.html#18-68\">source</a><a href=\"#impl-BlockDevice-for-VirtIOBlock\" class=\"anchor\">§</a><h3 class=\"code-header\">impl BlockDevice for <a class=\"struct\" href=\"os/drivers/block/virtio_blk/struct.VirtIOBlock.html\" title=\"struct os::drivers::block::virtio_blk::VirtIOBlock\">VirtIOBlock</a></h3></section></summary><div class=\"impl-items\"><section id=\"method.read_block\" class=\"method trait-impl\"><a class=\"src rightside\" href=\"src/os/drivers/block/virtio_blk.rs.html#19-39\">source</a><a href=\"#method.read_block\" class=\"anchor\">§</a><h4 class=\"code-header\">fn <a class=\"fn\">read_block</a>(&amp;self, block_id: <a class=\"primitive\" href=\"https://doc.rust-lang.org/nightly/core/primitive.usize.html\">usize</a>, buf: &amp;mut [<a class=\"primitive\" href=\"https://doc.rust-lang.org/nightly/core/primitive.u8.html\">u8</a>])</h4></section><section id=\"method.write_block\" class=\"method trait-impl\"><a class=\"src rightside\" href=\"src/os/drivers/block/virtio_blk.rs.html#40-60\">source</a><a href=\"#method.write_block\" class=\"anchor\">§</a><h4 class=\"code-header\">fn <a class=\"fn\">write_block</a>(&amp;self, block_id: <a class=\"primitive\" href=\"https://doc.rust-lang.org/nightly/core/primitive.usize.html\">usize</a>, buf: &amp;[<a class=\"primitive\" href=\"https://doc.rust-lang.org/nightly/core/primitive.u8.html\">u8</a>])</h4></section><section id=\"method.handle_irq\" class=\"method trait-impl\"><a class=\"src rightside\" href=\"src/os/drivers/block/virtio_blk.rs.html#61-67\">source</a><a href=\"#method.handle_irq\" class=\"anchor\">§</a><h4 class=\"code-header\">fn <a class=\"fn\">handle_irq</a>(&amp;self)</h4></section></div></details>","BlockDevice","os::board::BlockDeviceImpl"]]
};if (window.register_type_impls) {window.register_type_impls(type_impls);} else {window.pending_type_impls = type_impls;}})()