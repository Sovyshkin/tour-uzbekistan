<template>
  <button type="button" :class="style + ' border'">{{ title }}</button>
</template>
<script setup>
defineProps({
  title: String,
  style: String,
});
</script>
<style scoped>
button{
    border-radius: 10px;
    cursor: pointer;
}
</style>
