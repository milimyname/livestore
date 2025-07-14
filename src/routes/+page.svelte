<script lang="ts">
	import { events, tables } from '$lib/livestore/schema.js';
	import { queryDb } from '@livestore/livestore';

	let { data } = $props();

	const uiState$ = queryDb(tables.uiState.get(), { label: 'uiState' });
	const visibleTodos$ = queryDb(
		(get) => {
			const { filter } = get(uiState$);
			return tables.todos.where({
				deletedAt: null,
				completed: filter === 'all' ? undefined : filter === 'completed'
			});
		},
		{ label: 'visibleTodos' }
	);

	const visibleTodos = data.liveStore.useQuery(visibleTodos$);
	const uiState = data.liveStore.useQuery(uiState$);

	const addTodo = () => {
		const text = uiState().newTodoText.trim();
		if (!text) return;
		data.liveStore.commit(
			events.todoCreated({ id: crypto.randomUUID(), text }),
			events.uiStateSet({ newTodoText: '' })
		);
	};
</script>

<main style="padding-top: 3rem;">
	<h1>LiveStore + SvelteKit</h1>

	<input
		bind:value={
			() => {
				return uiState().newTodoText;
			},
			(v) => {
				return data.liveStore.commit(events.uiStateSet({ newTodoText: v.toLowerCase() }));
			}
		}
		onkeydown={(e) => e.key === 'Enter' && addTodo()}
		placeholder="What needs to be done?"
	/>

	<ul>
		{#each visibleTodos() as todo (todo.id)}
			<li>
				<input
					type="checkbox"
					bind:checked={todo.completed}
					onchange={() =>
						data.liveStore.commit(
							todo.completed
								? events.todoCompleted({ id: todo.id })
								: events.todoUncompleted({ id: todo.id })
						)}
				/>
				{todo.text}
			</li>
			<button
				onclick={() =>
					data.liveStore.commit(events.todoDeleted({ id: todo.id, deletedAt: new Date() }))}
			>
				delete
			</button>
		{/each}
	</ul>
</main>
