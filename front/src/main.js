import './assets/main.css'
import { createApp } from 'vue'
import App from './App.vue'
import router from './router'
import i18n from './i18n'
import vClickOutside from 'click-outside-vue3'

createApp(App).use(router).use(vClickOutside).use(i18n).mount('#app')
