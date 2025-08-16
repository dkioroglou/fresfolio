const SignupForm = defineComponent({
    data() {
        return {
            email: '',
            password: '',
            passwordRepeated: '',
        };
    },
    computed: {
        cardWidth() {
        // Dynamically set card width based on screen size
        return this.$q.screen.lt.md ? '70%' : '400px'; // 70% in small screens, else 400px width.
        }
    },
    methods: {
        async createUser() {
            // Handle login logic here, e.g., send data to an API
            if (this.passwordRepeated != this.password){
                this.$q.notify({
                    message: 'Passwords do not match.',
                    color: 'negative'
                })
            } else{
                if (this.email && this.password) {
                    try {
                        const response = await fetch("/api/create-user", {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json",
                        },
                        body: JSON.stringify(
                            {
                                "username": this.email,
                                "password": this.password
                            }),
                        });

                        if (response.ok) {
                            window.location.href = '/login'
                        } else {
                            this.$q.notify({
                                message: 'Error storing user credentials.',
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
        }
    },
    template: `
<q-card class="q-pa-md" :style="{ width: cardWidth }">
    <q-card-section>
        <div class="text-h6 text-center">Setup user</div>
    </q-card-section>

    <q-card-section>
        <q-form @submit.prevent="createUser">
            <q-input
                v-model="email"
                label="Email"
                filled
                dense
                no-error-icon="true"
                :rules="[val => !!val || 'email is required']"
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

            <q-input
                v-model="passwordRepeated"
                label="Repeat password"
                type="password"
                filled
                dense
                no-error-icon="true"
                :rules="[val => val === password || 'Passwords do not match']"
                class="q-mt-xs"
                lazy-rules
            />

            <q-btn
                label="Submit"
                color="primary"
                type="submit"
                class="full-width q-mt-md"
            />
        </q-form>
    </q-card-section>
</q-card>
  `
});


