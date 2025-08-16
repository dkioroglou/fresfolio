// Create the Vue app and mount it
//
const app = createApp({
  components: {
      LoginLayout,
      ProjectsLayout
  }
});

// Use Quasar in the Vue app
app.use(Quasar);

// Mount the app to #my-app
app.mount('#my-app');

