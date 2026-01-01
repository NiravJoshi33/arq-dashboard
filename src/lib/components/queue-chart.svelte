<script lang="ts">
	import { onMount } from 'svelte';
	import * as echarts from 'echarts';
	import { cn } from '$lib/utils';
	import type { QueueStats } from '$lib/types';

	interface Props {
		queues: QueueStats[];
		class?: string;
	}

	let { queues, class: className }: Props = $props();

	let chartContainer: HTMLDivElement;
	let chart: echarts.ECharts | null = null;

	const chartData = $derived({
		names: queues.map((q) => q.name),
		depths: queues.map((q) => q.depth)
	});

	function initChart() {
		if (!chartContainer) return;

		chart = echarts.init(chartContainer, 'dark', { renderer: 'canvas' });

		const option: echarts.EChartsOption = {
			backgroundColor: 'transparent',
			tooltip: {
				trigger: 'axis',
				axisPointer: {
					type: 'shadow'
				},
				backgroundColor: 'rgba(0, 0, 0, 0.8)',
				borderColor: 'rgba(255, 255, 255, 0.1)',
				textStyle: {
					color: '#fff'
				}
			},
			grid: {
				left: '3%',
				right: '4%',
				bottom: '3%',
				top: '10%',
				containLabel: true
			},
			xAxis: {
				type: 'category',
				data: chartData.names,
				axisLine: {
					lineStyle: {
						color: 'rgba(255, 255, 255, 0.2)'
					}
				},
				axisLabel: {
					color: 'rgba(255, 255, 255, 0.6)'
				}
			},
			yAxis: {
				type: 'value',
				axisLine: {
					lineStyle: {
						color: 'rgba(255, 255, 255, 0.2)'
					}
				},
				axisLabel: {
					color: 'rgba(255, 255, 255, 0.6)'
				},
				splitLine: {
					lineStyle: {
						color: 'rgba(255, 255, 255, 0.1)'
					}
				}
			},
			series: [
				{
					name: 'Queue Depth',
					type: 'bar',
					data: chartData.depths,
					itemStyle: {
						color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
							{ offset: 0, color: 'rgba(0, 200, 200, 0.8)' },
							{ offset: 1, color: 'rgba(0, 150, 150, 0.3)' }
						]),
						borderRadius: [4, 4, 0, 0]
					},
					emphasis: {
						itemStyle: {
							color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
								{ offset: 0, color: 'rgba(0, 230, 230, 1)' },
								{ offset: 1, color: 'rgba(0, 180, 180, 0.5)' }
							])
						}
					}
				}
			]
		};

		chart.setOption(option);
	}

	function updateChart() {
		if (!chart) return;

		chart.setOption({
			xAxis: {
				data: chartData.names
			},
			series: [
				{
					data: chartData.depths
				}
			]
		});
	}

	$effect(() => {
		if (chart && chartData) {
			updateChart();
		}
	});

	onMount(() => {
		initChart();

		const resizeObserver = new ResizeObserver(() => {
			chart?.resize();
		});

		if (chartContainer) {
			resizeObserver.observe(chartContainer);
		}

		return () => {
			resizeObserver.disconnect();
			chart?.dispose();
		};
	});
</script>

<div bind:this={chartContainer} class={cn('w-full h-[300px]', className)}></div>

