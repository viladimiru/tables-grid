<template>
	<div
		class="tables-view"
		:class="{
			'is-loading': isLoading,
			'is-empty': !isLoading && isTablesListEmpty,
		}"
	>
		<div class="tables-block">
			<div
				class="tables-grid"
				ref="grid"
				:style="{
					width: getGridWidth,
					height: getGridHeight,
					backgroundSize: ''.concat(gridSize, 'px'),
					backgroundPosition: ''.concat(
						(gridSize / 2) * -1,
						'px ',
						(gridSize / 2) * -1,
						'px'
					),
				}"
			>
				<div
					class="table-wrapper"
					:style="{
						width: table.widthPx,
						height: table.heightPx,
						left: table.left,
						top: table.top,
					}"
					v-on:dblclick="changeTableType(table)"
					v-if="!isTablesListEmpty"
					v-for="(table, i) of _tables"
				>
					<div class="delete" @click="onDelete(i)">×</div>
					<div
						class="table"
						:class="{
							circle: table.isRounded,
							'is-dragging': dragItemIndex === i,
						}"
						:ontouchstart="(e) => onTableDragStart(e, i)"
						:onmousedown="(e) => onTableDragStart(e, i)"
					></div>
					<div class="table-guests-wrapper">
						<span class="table-guests" @click="onEditTableTitle(i)">
							{{ table.title }}
						</span>
					</div>
					<div
						class="table-resize-bottom"
						:ontouchstart="(e) => onResizeYStart(e, i)"
						:onmousedown="(e) => onResizeYStart(e, i)"
					></div>
					<div
						class="table-resize ui-icon ui-icon-gripsmall-diagonal-se"
						style="z-index: 90"
						:ontouchstart="(e) => onResizeStart(e, i)"
						:onmousedown="(e) => onResizeStart(e, i)"
					></div>
				</div>
			</div>
		</div>
	</div>
</template>

<script setup>
import { onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { computed } from '@vue/reactivity';
import { throttle } from '../utils';

const props = defineProps({
	tables: Array,
	isLoading: Boolean,
	gridSize: Number,
	gridWidth: Number,
	gridHeight: Number
});

const emit = defineEmits(['on-save']);

const gridSize = ref(props.gridSize);

const gridWidth = ref(props.gridWidth);
const gridHeight = ref(props.gridHeight);

const dragItemIndex = ref(-1);
const resizeItemIndex = ref(-1);
const resizeYItemIndex = ref(-1);
const grid = ref();
const gridBoundingPosition = ref();

watch([gridSize, gridWidth, gridHeight], () => {
	_tables.value.forEach(transformTableData);
});
watch(
	() => props.tables,
	() => {
		updateInnerTablesValue();
	}
);

const _tables = ref([]);
const _tablesSnapshot = ref();
const isTablesListEmpty = computed(() => !_tables.value?.length);

onMounted(() => {
	onResize();
	if (!props.gridSize) {
		const {width, height} = gridBoundingPosition.value
		
		if (width > height || gridWidth.value > gridHeight.value) {
			gridSize.value = width / gridWidth.value;
		} else {
			gridSize.value = height / gridHeight.value;
		}
	}
	document.addEventListener('mousedown', handleChanges, {passive: false});
	document.addEventListener('mousemove', handleChanges, {passive: false});
	document.addEventListener('touchmove', handleChanges, {passive: false});
	document.addEventListener('mouseup', onTableDragEnd);
	document.addEventListener('touchend', onTableDragEnd);
	window.addEventListener('resize', onResize);
	updateInnerTablesValue();
});

const updateInnerTablesValue = () => {
	_tables.value = JSON.parse(JSON.stringify(props.tables || []));
	_tables.value = _tables.value.map(transformTableData);
	_tablesSnapshot.value = JSON.stringify(_tables.value);
};


onBeforeUnmount(() => {
	document.removeEventListener('mousedown', handleChanges);
	document.removeEventListener('mousemove', handleChanges);
	document.removeEventListener('touchmove', handleChanges);
	document.removeEventListener('mouseup', onTableDragEnd);
	document.removeEventListener('touchend', onTableDragEnd);
	window.removeEventListener('resize', onResize);
});

const getGridWidth = computed(() => {
	return ''.concat(
		gridSize.value * gridWidth.value + gridSize.value / gridSize.value,
		'px'
	);
});

const getGridHeight = computed(() => {
	return ''.concat(
		gridSize.value * gridHeight.value + gridSize.value / gridSize.value,
		'px'
	);
});

function onResize() {
	gridBoundingPosition.value = grid.value.getBoundingClientRect();
}

function onEditTableTitle(i) {
	const result = prompt('Enter new table name', _tables.value[i].title);
	if (result) {
		_tables.value[i].title = result;
	}
}

const onDelete = (i) => {
	_tables.value.splice(i, 1);
};

function handleChanges(e) {
	const isResizing = resizeItemIndex.value !== -1;
	const isResizingY = resizeYItemIndex.value !== -1;
	const isDragging = dragItemIndex.value !== -1;
	if (isResizing || isResizingY || isDragging) {
		e.preventDefault()
	}
	if (isResizing) {
		throttleOnResize(e, _tables.value[resizeItemIndex.value]);
		return;
	}
	if (isResizingY) {
		throttleOnResize(e, _tables.value[resizeYItemIndex.value]);
		return;
	}
	if (!isDragging) return;
	throttleOnDrag(e, _tables.value[dragItemIndex.value]);
}

function onTableDragStart(e, i) {
	dragItemIndex.value = i;
	_tables.value[i].dragStartCoordinates = getEventCoordinates(e);
	document.body.classList.add('is-dragging');
}

function onTableDragEnd() {
	if (dragItemIndex.value !== -1) {
		dragItemIndex.value = -1;
		document.body.classList.remove('is-dragging');
	}
	if (resizeItemIndex.value !== -1) {
		resizeItemIndex.value = -1;
		document.body.classList.remove('is-resizing');
	}
	if (resizeYItemIndex.value !== -1) {
		resizeYItemIndex.value = -1;
		document.body.classList.remove('is-resizing-y');
	}
}

const throttleOnDrag = throttle(onTableDrag, 10);
const throttleOnResize = throttle(onTableResize, 10);

function onTableDrag(e, table) {
	const { clientX, clientY, updateOnDrag } = initializeData(e, table);
	if (clientX === 0 && clientY === 0) {
		return;
	}

	updateOnDrag();

	table = transformTableData(table);
}

function onTableResize(e, table) {
	const { clientX, clientY, updateOnResize, updateOnResizeY } = initializeData(
		e,
		table
	);
	if (resizeYItemIndex.value !== -1) {
		if (clientY === 0) {
			return;
		}
		updateOnResizeY();
		table = transformTableData(table, true);
	}
	if (resizeItemIndex.value !== -1) {
		if (clientX === 0 && clientY === 0) {
			return;
		}
		updateOnResize();
		table = transformTableData(table, true);
	}
}

function onResizeStart(e, i) {
	resizeItemIndex.value = i;
	document.body.classList.add('is-resizing');
	onTableResizeStart(e, i);
}
function onResizeYStart(e, i) {
	resizeYItemIndex.value = i;
	document.body.classList.add('is-resizing-y');
	onTableResizeStart(e, i);
}
function onTableResizeStart(e, i) {
	_tables.value[i].dragStartCoordinates = getEventCoordinates(e);
}
const getEventCoordinates = (e) => {
	const { clientX, clientY } = e instanceof TouchEvent ? e.touches[0] : e;
	return [clientX, clientY];
};
const transformTableData = (v, isResized = false) => {
	if (isResized) {
		v.width = Number(v.width.toFixed(9));
		v.height = Number(v.height.toFixed(9));
		if (v.width <= 1) {
			v.width = 1;
		}
		if (v.height <= 1) {
			v.height = 1;
		}
		if (v.x + v.width >= gridWidth.value) {
			v.width = gridWidth.value - v.x;
		}
		if (v.y + v.height >= gridHeight.value) {
			v.height = gridHeight.value - v.y;
		}
	} else {
		if (v.x + v.width >= gridWidth.value) {
			v.x = gridWidth.value - v.width;
		}
		if (v.y + v.height >= gridHeight.value) {
			v.y = gridHeight.value - v.height;
		}
		if (v.y < 0) {
			v.y = 0;
		}
		if (v.x < 0) {
			v.x = 0;
		}
	}
	v.widthPx = getAsidePxUnits(v.width);
	v.heightPx = getAsidePxUnits(v.height);
	v.left = getAsidePxUnits(v.x);
	v.top = getAsidePxUnits(v.y);
	return v;
};
const initializeData = (e, table) => {
	const [clientX, clientY] = getEventCoordinates(e);

	let xDiff = clientX - table.dragStartCoordinates[0];
	let yDiff = clientY - table.dragStartCoordinates[1];

	const isIncrementedByX = xDiff > gridSize.value;
	const isDecrementedByX = xDiff * -1 > gridSize.value;
	const isIncrementedByY = yDiff > gridSize.value;
	const isDecrementedByY = yDiff * -1 > gridSize.value;

	const incrementXPosition = () => {
		table.x = table.x + xDiff / gridSize.value;
		if (table.x + table.width > gridWidth.value) {
			table.x = gridWidth.value - table.width;
		}
		table.dragStartCoordinates[0] = clientX;
	};
	const incrementYPosition = () => {
		table.y = table.y + yDiff / gridSize.value;
		table.dragStartCoordinates[1] = clientY;
	};
	const decrementXPosition = () => {
		table.x = table.x - (xDiff * -1) / gridSize.value;
		table.dragStartCoordinates[0] = clientX;
	};
	const decrementYPosition = () => {
		table.y = table.y - (yDiff * -1) / gridSize.value;
		table.dragStartCoordinates[1] = clientY;
	};
	const incrementWidth = () => {
		table.width = table.width + xDiff / gridSize.value;
		table.dragStartCoordinates[0] = clientX;
	};
	const incrementHeight = () => {
		table.height = table.height + yDiff / gridSize.value;
		table.dragStartCoordinates[1] = clientY;
	};
	const decrementWidth = () => {
		table.width = table.width - (xDiff * -1) / gridSize.value;
		table.dragStartCoordinates[0] = clientX;
	};
	const decrementHeight = () => {
		table.height = table.height - (yDiff * -1) / gridSize.value;
		table.dragStartCoordinates[1] = clientY;
	};
	const updateOnDrag = () => {
		const {offsetLeft: left, offsetHeight, offsetTop: top, offsetWidth} = grid.value;
		const bottom = top + offsetHeight
		const right = left + offsetWidth

		if (left > clientX) {
			xDiff = 0;
			table.x = 0;
		}
		if (top > clientY) {
			yDiff = 0;
			table.y = 0;
		}
		if (right < clientX) {
			xDiff = 0;
			table.x = gridWidth.value;
		}
		if (bottom < clientY) {
			yDiff = 0;
			table.y = gridHeight.value;
		}
		if (isIncrementedByX) {
			incrementXPosition();
		}
		if (isIncrementedByY) {
			incrementYPosition();
		}
		if (isDecrementedByX) {
			decrementXPosition();
		}
		if (isDecrementedByY) {
			decrementYPosition();
		}
	};
	const updateOnResize = () => {
		updateOnResizeX();
		updateOnResizeY();
	};
	const updateOnResizeX = () => {
		const leftPosition =
			gridBoundingPosition.value.left + getTableNode().offsetLeft;
		if (leftPosition > clientX) {
			xDiff = 0;
			table.width = 1;
		}
		if (isIncrementedByX) {
			incrementWidth();
		}
		if (isDecrementedByX) {
			decrementWidth();
		}
	};
	const updateOnResizeY = () => {
		const topPosition =
			gridBoundingPosition.value.top + getTableNode().offsetTop;
		if (topPosition > clientY) {
			yDiff = 0;
			table.height = 1;
		}
		if (isIncrementedByY) {
			incrementHeight();
		}
		if (isDecrementedByY) {
			decrementHeight();
		}
	};
	const getTableNode = () => {
		if (dragItemIndex.value !== -1) {
			return grid.value.children[dragItemIndex.value];
		}
		if (resizeItemIndex.value !== -1) {
			return grid.value.children[resizeItemIndex.value];
		}
		if (resizeYItemIndex.value !== -1) {
			return grid.value.children[resizeYItemIndex.value];
		}
	};

	return {
		updateOnDrag,
		updateOnResize,
		updateOnResizeY,
		clientX,
		clientY,
		getTableNode,
	};
};
const changeTableType = (table) => {
	table.isRounded = !table.isRounded;
};
const onCreateNewTable = (rounded = false) => {
	_tables.value.push(
		transformTableData({
			width: 3,
			height: 3,
			title: ''.concat('Table ', _tables.value.length + 1),
			x: rounded ? 3 : 0,
			y: gridHeight.value - 3,
			isRounded: rounded,
		})
	);
};
const getAsidePxUnits = (v) =>
	''.concat(
		Math.round((gridSize.value * v) / gridSize.value) * gridSize.value +
			gridSize.value / gridSize.value,
		'px'
	);
</script>

<style lang="scss">
body {
	margin: 0;
}
body.is-dragging {
	cursor: move;
}
body.is-resizing,
body.is-resizing-y,
body.is-dragging {
	user-select: none;
	.tables-grid {
		cursor: inherit !important;
	}
}
body.is-resizing {
	cursor: se-resize;
}
body.is-resizing-y {
	cursor: s-resize;
}
.tables-view {
	width: 100%;
	height: 100%;
}
.tables-view.is-loading {
	opacity: 0.7;
	pointer-events: none;
	position: relative;
	&:after {
		content: 'Loading...';
		position: absolute;
		left: 50%;
		top: 50%;
		transform: translate(-50%);
	}
}
.tables-view.is-empty {
	.tables-grid {
		opacity: 0.7;
		&:after {
			content: 'Scheme is empty';
			position: absolute;
			left: 50%;
			top: 50%;
			transform: translate(-50%);
		}
	}
}
.tables-block {
	display: grid;
	grid-template-rows: 1fr auto;
	width: 100%;
	height: 100%;
}
.tables-grid {
	position: relative;
	background-image: url('/assets/grid-bg.png');
	width: 100%;
	height: 100%;
	margin: auto;
	align-self: center;
}
.table-wrapper {
	position: absolute;
}
.table {
	background: #aaa;
	box-shadow: 0 1px 4px 0 rgb(0 0 0 / 20%);
	box-sizing: border-box;
	color: #fff;
	font-size: 20px;
	font-weight: 700;
	position: absolute;
	text-align: center;
	height: 100%;
	width: 100%;
	cursor: pointer;
	&.circle {
		border-radius: 350px;
	}
	&.is-dragging {
		opacity: 0.8;
	}
	&--placeholder {
		position: relative;
		opacity: 0.6;
		transition: 0.2s ease-in-out;
		cursor: cell;
		&:hover {
			opacity: 1;
		}
	}
}
.table-resize-bottom {
	position: absolute;
	bottom: -3px;
	left: 0;
	height: 2px;
	width: 100%;
	background-color: rgba(rgb(80, 80, 80), 0.6);
	cursor: s-resize;
}
.delete {
	position: absolute;
	right: -5px;
	top: -10px;
	z-index: 1;
	color: white;
	background-color: black;
	border-radius: 50%;
	width: 15px;
	height: 15px;
	text-align: center;
	opacity: 0.1;
	transition: 0.2s ease-in-out;
	line-height: 0.9;
	cursor: pointer;
	user-select: none;
	&:hover {
		opacity: 1;
	}
}
.ui-icon-gripsmall-diagonal-se {
	background-position: -64px -224px;
}

.ui-icon,
.ui-widget-content .ui-icon {
	background-image: url('/assets/ui-icons.png');
}

.ui-icon {
	position: absolute;
	height: 16px;
	width: 16px;
	bottom: 1px;
	cursor: se-resize;
	right: 1px;
}

.table-guests-wrapper {
	display: flex;
	width: 100%;
	height: 100%;
	align-items: center;
	justify-content: center;
	.table-guests {
		font-size: 14px;
		z-index: 1;
		text-align: center;
		cursor: pointer;
		&:hover {
			opacity: 0.4;
			background-color: white;
		}
	}
}
</style>
