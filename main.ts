import { App, Plugin, PluginSettingTab, Notice, TFile, getFrontMatterInfo } from 'obsidian'

/* ---------- Helper ---------- */
function debounce<T extends (...args: any[]) => void>(func: T, wait: number) {
    let timeout: number | null = null
    return (...args: Parameters<T>) => {
        if (timeout) window.clearTimeout(timeout)
        timeout = window.setTimeout(() => func(...args), wait)
    }
}

/* ---------- Main Plugin ---------- */
export default class TodoSweepPlugin extends Plugin {
    async onload() {
        this.addSettingTab(new TodoSweepSettingTab(this.app, this))

        // Register code block processor for todo-input
        this.registerMarkdownCodeBlockProcessor('todo-input', (source, el, ctx) => {
            const container = el.createDiv('todo-input-bar')

            const inputGroup = container.createDiv('todo-input-group')

            const inputSection = inputGroup.createDiv('todo-input-section')
            const input = inputSection.createEl('input', {
                type: 'text',
                placeholder: 'Add a new todo item...',
                cls: 'todo-input'
            })

            const addButton = inputSection.createEl('button', {
                text: 'Add',
                cls: 'todo-add-btn'
            })

            const cleanSection = inputGroup.createDiv('todo-clean-section')
            const cleanButton = cleanSection.createEl('button', {
                text: '🧹 Clean',
                cls: 'todo-clean-btn'
            })

            const file = this.app.vault.getAbstractFileByPath(ctx.sourcePath)
            if (!(file instanceof TFile)) return

            // Bind events directly here
            const addTodo = async () => {
                const text = input.value.trim()
                if (text) {
                    try {
                        await this.addTodoItem(file, text)
                        input.value = ''
                        input.focus()
                    } catch (error) {
                        console.error(error)
                        new Notice('Error adding todo: ' + (error as Error).message)
                    }
                } else {
                    new Notice('Please enter some text for the todo item')
                }
            }

            const cleanTodos = async () => {
                try {
                    await this.cleanFile(file)
                } catch (error) {
                    console.error(error)
                    new Notice('Error cleaning todos: ' + (error as Error).message)
                }
            }

            addButton.addEventListener('click', addTodo)
            cleanButton.addEventListener('click', cleanTodos)
            input.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault()
                    addTodo()
                }
            })
        })

        const debouncedAutoMove = debounce(async (file: TFile) => {
            if (await this.noteHasTodoInput(file)) {
                await this.autoMoveChecked(file)
            }
        }, 500)

        this.registerEvent(
            this.app.workspace.on('editor-change', (editor, info) => {
                if (info.file) debouncedAutoMove(info.file)
            })
        )

        this.registerEvent(
            this.app.vault.on('modify', async (file) => {
                if (file instanceof TFile && (await this.noteHasTodoInput(file))) {
                    await this.autoMoveChecked(file)
                }
            })
        )
    }

    /* ---------- Helpers ---------- */
    private async noteHasTodoInput(file: TFile): Promise<boolean> {
        try {
            const content = await this.app.vault.read(file)
            return content.includes('```todo-input')
        } catch {
            return false
        }
    }

    /* ---------- Cleanup logic ---------- */
    private async cleanFile(file: TFile) {
        if (!(await this.noteHasTodoInput(file))) {
            new Notice("This note doesn't contain a todo-input block, skipping clean.")
            return
        }

        const doneLineRegex = /\n?\s*- \[[xX]\].*(?:\r?\n|$)/g
        let removedCount = 0

        await this.app.vault.process(file, (data) => {
            const cleaned = data.replace(doneLineRegex, () => {
                removedCount++
                return ''
            })
            return cleaned.replace(/^\n+/, '').replace(/\n+$/, '')
        })

        if (removedCount > 0) {
            new Notice(`Removed ${removedCount} completed task(s).`)
        } else {
            new Notice('Nothing to clean: no completed todos found.')
        }
    }

    private async autoMoveChecked(file: TFile) {
        await this.app.vault.process(file, (data) => {
            const lines = data.split(/\r?\n/)

            const unchecked: string[] = []
            const checked: string[] = []
            const others: string[] = []

            for (const line of lines) {
                if (/^- \[ \]/.test(line)) {
                    unchecked.push(line)
                } else if (/^- \[[xX]\]/.test(line)) {
                    checked.push(line)
                } else {
                    others.push(line)
                }
            }

            return [...others, ...unchecked, ...checked].join('\n')
        })
    }

    async addTodoItem(file: TFile, todoText: string) {
        if (!(await this.noteHasTodoInput(file))) {
            new Notice("This note doesn't contain a todo-input block, cannot add todo.")
            return
        }

        await this.app.vault.process(file, (data) => {
            const todoItem = `- [ ] ${todoText}\n`
            const frontmatterInfo = getFrontMatterInfo(data)
            let insertPosition = 0
            if (frontmatterInfo.exists) {
                insertPosition = frontmatterInfo.contentStart
            }
            return data.slice(0, insertPosition) + todoItem + data.slice(insertPosition)
        })
    }
}

/* ---------- Settings Tab ---------- */
class TodoSweepSettingTab extends PluginSettingTab {
    constructor(
        app: App,
        private plugin: TodoSweepPlugin
    ) {
        super(app, plugin)
    }

    display(): void {
        const { containerEl } = this
        containerEl.empty()

        // Usage instructions
        const info = document.createElement('div')
        info.addClass('todo-sweep-info')

        const strong = document.createElement('strong')
        strong.textContent = 'Todo input bar:'

        const br1 = document.createElement('br')
        const text = document.createTextNode(
            'Add this code block at the top of a note to get an input bar with add and clean functions:'
        )

        const br2 = document.createElement('br')
        const code = document.createElement('code')
        code.addClass('todo-sweep-code')
        code.textContent = '```todo-input\n\n```'

        info.appendChild(strong)
        info.appendChild(br1)
        info.appendChild(text)
        info.appendChild(br2)
        info.appendChild(code)

        containerEl.appendChild(info)
    }
}
