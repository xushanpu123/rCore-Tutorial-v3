(function() {var type_impls = {
"os":[["<details class=\"toggle implementors-toggle\" open><summary><section id=\"impl-NS16550a%3CBASE_ADDR%3E\" class=\"impl\"><a class=\"src rightside\" href=\"src/os/drivers/chardev/ns16550a.rs.html#133-150\">source</a><a href=\"#impl-NS16550a%3CBASE_ADDR%3E\" class=\"anchor\">§</a><h3 class=\"code-header\">impl&lt;const BASE_ADDR: <a class=\"primitive\" href=\"https://doc.rust-lang.org/nightly/core/primitive.usize.html\">usize</a>&gt; <a class=\"struct\" href=\"os/drivers/chardev/ns16550a/struct.NS16550a.html\" title=\"struct os::drivers::chardev::ns16550a::NS16550a\">NS16550a</a>&lt;BASE_ADDR&gt;</h3></section></summary><div class=\"impl-items\"><section id=\"method.new\" class=\"method\"><a class=\"src rightside\" href=\"src/os/drivers/chardev/ns16550a.rs.html#134-144\">source</a><h4 class=\"code-header\">pub fn <a href=\"os/drivers/chardev/ns16550a/struct.NS16550a.html#tymethod.new\" class=\"fn\">new</a>() -&gt; Self</h4></section><section id=\"method.read_buffer_is_empty\" class=\"method\"><a class=\"src rightside\" href=\"src/os/drivers/chardev/ns16550a.rs.html#146-149\">source</a><h4 class=\"code-header\">pub fn <a href=\"os/drivers/chardev/ns16550a/struct.NS16550a.html#tymethod.read_buffer_is_empty\" class=\"fn\">read_buffer_is_empty</a>(&amp;self) -&gt; <a class=\"primitive\" href=\"https://doc.rust-lang.org/nightly/core/primitive.bool.html\">bool</a></h4></section></div></details>",0,"os::board::CharDeviceImpl"],["<details class=\"toggle implementors-toggle\" open><summary><section id=\"impl-CharDevice-for-NS16550a%3CBASE_ADDR%3E\" class=\"impl\"><a class=\"src rightside\" href=\"src/os/drivers/chardev/ns16550a.rs.html#152-187\">source</a><a href=\"#impl-CharDevice-for-NS16550a%3CBASE_ADDR%3E\" class=\"anchor\">§</a><h3 class=\"code-header\">impl&lt;const BASE_ADDR: <a class=\"primitive\" href=\"https://doc.rust-lang.org/nightly/core/primitive.usize.html\">usize</a>&gt; <a class=\"trait\" href=\"os/drivers/chardev/trait.CharDevice.html\" title=\"trait os::drivers::chardev::CharDevice\">CharDevice</a> for <a class=\"struct\" href=\"os/drivers/chardev/ns16550a/struct.NS16550a.html\" title=\"struct os::drivers::chardev::ns16550a::NS16550a\">NS16550a</a>&lt;BASE_ADDR&gt;</h3></section></summary><div class=\"impl-items\"><section id=\"method.init\" class=\"method trait-impl\"><a class=\"src rightside\" href=\"src/os/drivers/chardev/ns16550a.rs.html#153-157\">source</a><a href=\"#method.init\" class=\"anchor\">§</a><h4 class=\"code-header\">fn <a href=\"os/drivers/chardev/trait.CharDevice.html#tymethod.init\" class=\"fn\">init</a>(&amp;self)</h4></section><section id=\"method.read\" class=\"method trait-impl\"><a class=\"src rightside\" href=\"src/os/drivers/chardev/ns16550a.rs.html#159-170\">source</a><a href=\"#method.read\" class=\"anchor\">§</a><h4 class=\"code-header\">fn <a href=\"os/drivers/chardev/trait.CharDevice.html#tymethod.read\" class=\"fn\">read</a>(&amp;self) -&gt; <a class=\"primitive\" href=\"https://doc.rust-lang.org/nightly/core/primitive.u8.html\">u8</a></h4></section><section id=\"method.write\" class=\"method trait-impl\"><a class=\"src rightside\" href=\"src/os/drivers/chardev/ns16550a.rs.html#171-174\">source</a><a href=\"#method.write\" class=\"anchor\">§</a><h4 class=\"code-header\">fn <a href=\"os/drivers/chardev/trait.CharDevice.html#tymethod.write\" class=\"fn\">write</a>(&amp;self, ch: <a class=\"primitive\" href=\"https://doc.rust-lang.org/nightly/core/primitive.u8.html\">u8</a>)</h4></section><section id=\"method.handle_irq\" class=\"method trait-impl\"><a class=\"src rightside\" href=\"src/os/drivers/chardev/ns16550a.rs.html#175-186\">source</a><a href=\"#method.handle_irq\" class=\"anchor\">§</a><h4 class=\"code-header\">fn <a href=\"os/drivers/chardev/trait.CharDevice.html#tymethod.handle_irq\" class=\"fn\">handle_irq</a>(&amp;self)</h4></section></div></details>","CharDevice","os::board::CharDeviceImpl"]]
};if (window.register_type_impls) {window.register_type_impls(type_impls);} else {window.pending_type_impls = type_impls;}})()