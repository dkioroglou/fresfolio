const { createApp } = Vue;
import ProjectsLayout from '/static/js/vue_assets/compositions/projects_layout.js';

const app = createApp({
  components: {
      ProjectsLayout
  }
});

// Use Quasar in the Vue app
app.use(Quasar);

// Mount the app to #my-app
app.mount('#my-app');

