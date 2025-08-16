const LoginLayout = defineComponent({
    components: {
        SignupForm,
        LoginForm
    },
    data () {
        return {
            usersExist: false
        }
    },
    async mounted () {
        try {
            const response = await fetch("/api/get-users-exist", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            }
            });

            if (response.ok) {
                const data = await response.json();
                if (data['users_exist'] == 1) {
                    this.usersExist = true;
                }
            } else {
                this.$q.notify({
                    message: 'Something went wrong.',
                    color: 'negative',
                    position: "top-right"
                })
            }
        } catch (error) {
                console.error(error);
        }
    },
    template: `
<q-layout>
    <q-header elevated class="app-header-color text-white" height-hint="98">
        <q-toolbar>
            <q-toolbar-title>
                <q-avatar square>
                    <img src="/static/icons/fresfolio_logo.svg">
                </q-avatar>
            </q-toolbar-title>
        </q-toolbar>
    </q-header>
    <q-page-container>
        <q-page class="flex flex-center">
            <login-form v-if="usersExist"></login-form>
            <signup-form v-else></signup-form>
        </q-page>
    </q-page-container>
</q-layout>
  `
});


