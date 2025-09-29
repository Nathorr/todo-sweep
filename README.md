**Fork of** [https://github.com/yishentu/todo-manager](https://github.com/yishentu/todo-manager)

# Todo Sweep

An [Obsidian](https://obsidian.md) plugin that helps you keep your todo lists clean and organized:  

- **Quickly add new todos** via an inline input bar.
- **Auto-move checked items** to the bottom of your todo list, but above other checked items.  
- **Clean completed tasks** using Clean button.
- Works on both **desktop and mobile**.

A completed item must follow the pattern:

```markdown
- [x] Task description
```

---

## Installation

1. Clone or copy the plugin folder into
   `YOUR_VAULT/.obsidian/plugins/` directory.
2. Enable "Third-party plugins" in **Settings → Community plugins**.
3. Reload Obsidian and enable **Todo Sweep** in settings.

---

## Usage

1. Add the todo input bar at the top of a note using the code block:

```markdown
```todo-input
```
![Todo Sweep demo](demo.png)

2. Add new tasks quickly via the input bar.
3. Checked items are automatically moved below unchecked ones.
4. Clean up old completed tasks using the Clean button.