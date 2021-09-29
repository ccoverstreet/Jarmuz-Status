class extends HTMLElement  {
	constructor() {
		super();
		
		this.attachShadow({mode: "open"});

		this.websocketHandler = this.websocketHandler.bind(this);
	}

	init(source, config) {
		this.source = source;
		this.config = config;

		this.shadowRoot.innerHTML = `
<link rel="stylesheet" href="/assets/standard.css"/>
<style>
svg > * {
    stroke: var(--clr-accent);
    stroke-width: 30px;
    stroke-linecap: round;
    fill: transparent;
}

#status-table {
	width: 100%;
}
</style>
<div class="jmod-wrapper">
	<div class="jmod-header" style="display: flex">
		<h1>Hello</h1>
		<svg viewBox="0 0 360 360">
			<circle cx="180", cy="180" r="120"/>
        </svg>
	</div>

	<hr>

	<div class="jmod-body">
		<table id="status-table">
			<tr>
				<th>IP</th>
				<th>Status</th>
			</tr>
		</table>
		<div id="status-output"></div>
	</div>
</div>
		`

		try {
			this.websocket = new WebSocket(`ws://${document.location.host}/jmod/clientWebsocket?JMOD-Source=${this.source}`);
			this.websocket.onmessage = this.websocketHandler;
		} catch(err) {
			console.error(err);
			console.log(err);
		}
	}

	async websocketHandler(event) {
		let message = event.data;
		console.log(message);
		let parsed = await JSON.parse(message);
		console.log(parsed);
		let outputElem = this.shadowRoot.getElementById("status-output");
		outputElem.innerHTML = message
	}
}
