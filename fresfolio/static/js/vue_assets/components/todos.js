const Todos = defineComponent({
    props: ['projectid', 'focus'],
    data() {
        return {
            todos: [],
            newTodoText: "",
            showTodos: true,
            showDone: false,
            tab: "todo"
        }
    },
    methods: {
        async getTodos() {
            try {
                const response = await fetch("/todos/api/get-todos", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify(
                        {
                            "projectID": this.projectid,
                        }
                    )
            });

            if (response.ok) {
                this.todos = await response.json();
                this.tab = "todo"
            } else {
                console.error("Error: " + response.status);
            }
            } catch (error) {
                  console.error(error);
            }
        },
        async createTodo() {
            try {
                const response = await fetch("/todos/api/create-todo", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify(
                        {
                            "projectID": this.projectid,
                            "todo": this.newTodoText
                        }
                    )
              });

              if (response.ok) {
                  this.newTodoText = "";
                  this.getTodos();
              } else {
                  console.error("Error: " + response.status);
              }
            } catch (error) {
                  console.error(error);
            }

        },
        async setTodoDone(todoIDX) {
            try {
                const response = await fetch("/todos/api/set-todo-done", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify(
                        {
                            "projectID": this.projectid,
                            "todoID": this.todos[todoIDX]['id']
                        }
                    )
                });

                if (response.ok) {
                    this.todos[todoIDX]['done'] = 1
                } else {
                    const responseText = await response.text();
                    this.$q.notify({
                        message: responseText,
                        color: 'negative',
                        position: "top-right"
                    })
                }
            } catch (error) {
                  console.error(error);
            }
        },
        async setTodoNotDone(todoIDX) {
            try {
                const response = await fetch("/todos/api/set-todo-not-done", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify(
                        {
                            "projectID": this.projectid,
                            "todoID": this.todos[todoIDX]['id']
                        }
                    )
                });

                if (response.ok) {
                    this.todos[todoIDX]['done'] = 0
                } else {
                    const responseText = await response.text();
                    this.$q.notify({
                        message: responseText,
                        color: 'negative',
                        position: "top-right"
                    })
                }
            } catch (error) {
                  console.error(error);
            }
        },
        async deleteTodo(todoIDX) {
            try {
                const response = await fetch("/todos/api/delete-todo", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify(
                        {
                            "projectID": this.projectid,
                            "todoID": this.todos[todoIDX]['id']
                        }
                    )
                });

                if (response.ok) {
                    this.$q.notify({
                        message: "Todo deleted",
                        color: 'green',
                        position: "top-right"
                    })
                    this.todos.splice(todoIDX, 1)
                } else {
                    const responseText = await response.text();
                    this.$q.notify({
                        message: responseText,
                        color: 'negative',
                        position: "top-right"
                    })
                }
            } catch (error) {
                  console.error(error);
            }
        },
        async setTodo(todoIDX, scope) {
            try {
                const response = await fetch("/todos/api/set-todo", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify(
                        {
                            "projectID": this.projectid,
                            "todoID": this.todos[todoIDX]['id'],
                            "newTodoText": scope.value 
                        }
                    )
                });

                if (response.ok) {
                    scope.set(scope.value);
                } else {
                    const responseText = await response.text();
                    this.$q.notify({
                        message: responseText,
                        color: 'negative',
                        position: "top-right"
                    })
                    this.$refs.tagsPopup.hide();
                }
            } catch (error) {
                console.log(error)
                this.$q.notify({
                    message: "Something went wrong",
                    color: 'negative',
                    position: "top-right"
                })
            }
        },
        fractionDone() {
            let numTotal = 0;
            let numTodo = 0;
            let numDone = 0;

            this.todos.forEach(function(todo) {
                numTotal += 1;
                if (todo['done'] == 1) {
                    numDone += 1;
                } else {
                    numTodo += 1;
                }
            })
            return [numDone/numTotal, numDone+"/"+numTotal, Math.floor((numDone/numTotal)*100)];
        }
    },
    async mounted() {
        this.getTodos();
    },
    computed: {
        doneTodos() {
            return this.todos.filter(todo => todo.done === 1);
        },
        notDoneTodos() {
            return this.todos.filter(todo => todo.done === 0);
        }
    },
    watch: {
        focus(val) {
            if (val) {
                this.$refs.todoInput.focus();
            }
        }
    },
    template: `

<div class="row flex justify-center q-mb-md">
    <div class="col-2" style="margin-top:4px; margin-left:15px">
    </div>
</div>

<div class="row justify-left q-mb-md">

    <q-input 
        ref="todoInput"
        v-model="newTodoText"
        class="col-10 app-bg-color-5"  
        @keyup.enter="createTodo" 
        standout="bg-primary text-white" 
        input-class="text-white"
        label="Todo" 
    >
        <template v-slot:append>
            <q-icon v-if="newTodoText !== ''" 
                name="close" 
                @click="newTodoText = ''" 
                color="white" 
                class="cursor-pointer" 
            />
    </q-input>

    <q-circular-progress
          show-value
          size="50px"
          class="text-light-blue q-ml-sm"
          :value="fractionDone()[2]"
          size="30px"
          track-color="blue-grey-7"
          color="teal"
    >
        {{ fractionDone()[2] }}%
    </q-circular-progress>

</div>

<div v-if="todos.length !== 0">
    <div class="row flex justify-left">
        <div class="col-10">
            <div>
                {{fractionDone()[1]}} todos are done
            </div>
        </div>
    </div>

    <div class="q-gutter-y-md">
        <q-tabs v-model="tab" class="text-teal">
            <q-tab name="todo" label="Todo" />
            <q-tab name="done" label="Done" />
        </q-tabs>

        <q-tab-panels
            v-model="tab"
            class="bg-transparent"
        >

            <q-tab-panel name="todo">
                <div class="bg-transparent">
                    <q-list v-for="(item, itemIDX) in todos" :key="itemIDX">
                        <q-item v-if="item['done'] === 0">
                            <q-item-section>
                                <q-item-label class='text-white'>
                                    <div class="row full-width q-mb-sm">
                                        <q-btn 
                                            round 
                                            @click=setTodoDone(itemIDX) 
                                            size="sm" 
                                            color="primary" 
                                            class="q-mr-md" 
                                            icon="check"
                                        /> 

                                        <q-btn-dropdown 
                                            class="q-mr-md"
                                            rounded 
                                            size="sm"
                                            color="primary" 
                                            text-color="white"
                                            icon="settings"
                                            :menu-offset="[0,10]"
                                        >
                                            <q-list separator class="bg-primary" style="color: white;">
                                                <q-item clickable v-close-popup @click="deleteTodo(itemIDX)">
                                                    <q-item-section>
                                                        <q-item-label>Delete todo</q-item-label>
                                                    </q-item-section>
                                                </q-item>
                                            </q-list>

                                        </q-btn-dropdown>
                                    </div>
                                    <div class="row full-width">
                                        {{item.todo}}
                                    </div>

                                </q-item-label>

                                <q-popup-edit v-model="todos[itemIDX]['todo']" :validate="val => val.length > 1" v-slot="scope">
                                    <q-input
                                        autofocus
                                        dense
                                        v-model="scope.value"
                                        :model-value="scope.value"
                                        hint="Rename todo"
                                        :rules="[val => scope.validate(val) || 'More than 1 chars required']"
                                        @keyup.enter="setTodo(itemIDX, scope)"
                                    />
                                </q-popup-edit>

                            </q-item-section>
                        </q-item>
                        <q-separator dark />
                    </q-list>
                </div>
            </q-tab-panel>

            <q-tab-panel name="done">
                <div class="bg-transparent">
                    <q-list v-for="(item, itemIDX) in todos" :key="itemIDX">
                        <q-item v-if="item['done'] === 1">
                            <q-item-section>
                                <q-item-label class='text-white'>
                                    <div class="row full-width q-mb-sm">
                                        <q-btn 
                                            label='Set not done' 
                                            @click=setTodoNotDone(itemIDX) 
                                            size="sm" 
                                            color="primary" 
                                            class="q-mr-md"
                                        /> 

                                        <q-btn-dropdown 
                                            class="q-mr-md"
                                            rounded 
                                            size="sm"
                                            color="primary" 
                                            text-color="white"
                                            icon="settings"
                                            :menu-offset="[0,10]"
                                        >
                                            <q-list separator class="bg-primary" style="color: white;">
                                                <q-item clickable v-close-popup @click="deleteTodo(itemIDX)">
                                                    <q-item-section>
                                                        <q-item-label>Delete todo</q-item-label>
                                                    </q-item-section>
                                                </q-item>
                                            </q-list>

                                        </q-btn-dropdown>
                                    </div>

                                    <div class="row full-width q-mb-sm">
                                        {{item.todo}}
                                    </div>

                                </q-item-label>

                                <q-popup-edit v-model="todos[itemIDX]['todo']" :validate="val => val.length > 1" v-slot="scope">
                                    <q-input
                                        autofocus
                                        dense
                                        v-model="scope.value"
                                        :model-value="scope.value"
                                        hint="Rename todo"
                                        :rules="[val => scope.validate(val) || 'More than 1 chars required']"
                                        @keyup.enter="setTodo(itemIDX, scope)"
                                    />
                                </q-popup-edit>

                            </q-item-section>
                        </q-item>
                        <q-separator dark />
                    </q-list>
                </div>
            </q-tab-panel>

        </q-tab-panels>
    </div>
</div>
<div v-else>
    <q-list v-if="showTodos">
        <q-item>
            <q-item-section>
                <q-item-label class='my-text-muted' lines="1">
                    <span>Nothing to todo.</span>
                </q-item-label>
            </q-item-section>
        </q-item>
    </q-list>
</div>

    `
})
