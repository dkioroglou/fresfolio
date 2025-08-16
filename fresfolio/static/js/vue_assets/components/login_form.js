const LoginForm = defineComponent({
    data() {
        return {
            username: '',
            password: ''
        };
    },
    computed: {
        cardWidth() {
        // Dynamically set card width based on screen size
        return this.$q.screen.lt.md ? '70%' : '400px'; // 70% in small screens, else 400px width.
        }
    },
    methods: {
        async login() {
            // Handle login logic here, e.g., send data to an API
            if (this.username && this.password) {
                try {
                    const response = await fetch("/login", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify(
                        {
                            "username": this.username,
                            "password": this.password
                        }),
                    });

                    if (response.ok) {
                        window.location.href = '/'
                    } else {
                        this.$q.notify({
                            message: 'Error login user.',
                            color: 'negative',
                            position: "top-right"
                        })
                    }
                } catch (error) {
                        console.error(error);
                }
            } else {
                this.$q.notify({
                color: 'negative',
                message: 'Please fill in all fields'
                });
            }
        }
    },
    template: `
<q-card class="q-pa-md" :style="{ width: cardWidth }">
    <q-card-section>
        <div class="text-h6 text-center">Login</div>
    </q-card-section>

    <q-card-section>
        <q-form @submit.prevent="login">
            <q-input
                v-model="username"
                label="Email"
                filled
                dense
                no-error-icon="true"
                :rules="[val => !!val || 'Username is required']"
                lazy-rules
            />

            <q-input
                v-model="password"
                label="Password"
                type="password"
                filled
                dense
                no-error-icon="true"
                :rules="[val => !!val || 'Password is required']"
                class="q-mt-md"
                lazy-rules
            />

            <q-btn
                label="Login"
                color="primary"
                type="submit"
                class="full-width q-mt-md"
            />
        </q-form>
    </q-card-section>
</q-card>
  `
});


