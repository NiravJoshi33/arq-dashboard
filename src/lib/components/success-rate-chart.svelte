<script lang="ts">
	import { onMount } from 'svelte';
	import * as echarts from 'echarts';
	import { cn } from '$lib/utils';

	interface Props {
		hourRate: number;
		dayRate: number;
		class?: string;
	}

	let { hourRate, dayRate, class: className }: Props = $props();

	let chartContainer: HTMLDivElement;
	let chart: echarts.ECharts | null = null;

	function initChart() {
		if (!chartContainer) return;

		chart = echarts.init(chartContainer, 'dark', { renderer: 'canvas' });

		const option: echarts.EChartsOption = {
			backgroundColor: 'transparent',
			tooltip: {
				trigger: 'item',
				backgroundColor: 'rgba(0, 0, 0, 0.8)',
				borderColor: 'rgba(255, 255, 255, 0.1)',
				textStyle: {
					color: '#fff'
				},
				formatter: '{b}: {c}%'
			},
			legend: {
				orient: 'vertical',
				right: '5%',
				top: 'center',
				textStyle: {
					color: 'rgba(255, 255, 255, 0.7)'
				}
			},
			series: [
				{
					name: 'Success Rate',
					type: 'pie',
					radius: ['50%', '70%'],
					center: ['35%', '50%'],
					avoidLabelOverlap: false,
					itemStyle: {
						borderRadius: 8,
						borderColor: 'rgba(0, 0, 0, 0.3)',
						borderWidth: 2
					},
					label: {
						show: false
					},
					emphasis: {
						label: {
							show: true,
							fontSize: 14,
							fontWeight: 'bold',
							color: '#fff'
						}
					},
					labelLine: {
						show: false
					},
					data: [
						{
							value: hourRate,
							name: 'Last Hour',
							itemStyle: {
								color: new echarts.graphic.LinearGradient(0, 0, 1, 1, [
									{ offset: 0, color: 'rgba(0, 200, 150, 0.9)' },
									{ offset: 1, color: 'rgba(0, 150, 100, 0.7)' }
								])
							}
						},
						{
							value: dayRate,
							name: 'Last 24h',
							itemStyle: {
								color: new echarts.graphic.LinearGradient(0, 0, 1, 1, [
									{ offset: 0, color: 'rgba(100, 180, 255, 0.9)' },
									{ offset: 1, color: 'rgba(60, 120, 200, 0.7)' }
								])
							}
						}
					]
				}
			]
		};

		chart.setOption(option);
	}

	function updateChart() {
		if (!chart) return;

		chart.setOption({
			series: [
				{
					data: [
						{ value: hourRate, name: 'Last Hour' },
						{ value: dayRate, name: 'Last 24h' }
					]
				}
			]
		});
	}

	$effect(() => {
		if (chart) {
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

<div bind:this={chartContainer} class={cn('w-full h-[200px]', className)}></div>

