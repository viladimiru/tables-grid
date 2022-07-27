<template>
	<Space :tables="tables" @on-save="onSave" :is-loading="isLoading" />
	<div style="display: flex; justify-content: center">
		<pre>
			{{ tables }}
		</pre>
	</div>
</template>

<script setup>
import { onMounted, ref } from 'vue';
import Space from './components/space.vue';

const isLoading = ref(false);

onMounted(() => {
	isLoading.value = true;
	const timeOut = setTimeout(() => {
		tables.value = [
			{
				width: 3,
				height: 4,
				title: 5,
				x: 5,
				y: 3,
				isRounded: false,
			},
			{
				width: 2,
				height: 1,
				title: 12,
				x: 7,
				y: 10,
				isRounded: true,
			},
		];
		isLoading.value = false;
		clearTimeout(timeOut);
	}, 500);
});

const tables = ref();

const onSave = (v) => {
	isLoading.value = true;
	const timeOut = setTimeout(() => {
		tables.value = v;
		console.log(v)
		isLoading.value = false;
		clearTimeout(timeOut);
	}, 500);
};
</script>
<style></style>
