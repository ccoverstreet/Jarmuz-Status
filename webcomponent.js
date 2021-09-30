class extends HTMLElement  {
	constructor() {
		super();
		
		this.attachShadow({mode: "open"});

		this.websocketHandler = this.websocketHandler.bind(this);
		this.removeDevice = this.removeDevice.bind(this);
		this.addDevice = this.addDevice.bind(this);
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
#status-table-body {

}
#status-table-body > * > * {
	text-align: center;
}
</style>
<div class="jmod-wrapper">
	<div class="jmod-header" style="display: flex">
		<h1>Status</h1>
		<svg viewBox="0 0 360 360">
			<circle cx="180", cy="180" r="120"/>
        </svg>
	</div>

	<hr>

	<div class="jmod-body">
		<table id="status-table">
			<thead>
			<tr>
				<th>IP</th>
				<th>Name</th>
				<th>Status</th>
				<th style="color: var(--clr-red)">X</th>
			</tr>
			<tr>
				<td colspan="4"><hr></td>
			</tr>
			</thead>

			<tbody id="status-table-body">

			</tbody>
		</table>

		<form id="status-add" onsubmit="event.preventDefault(); this.getRootNode().host.addDevice(event, this)">
			<label>IP:</label>
			<input id="status-add-ip"></input>
			<br>
			<label>Name:</label>
			<input id="status-add-name"></input>
			<button onclick=""></button>
		</form>
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
		let parsed = await JSON.parse(message);
		let table = this.shadowRoot.getElementById("status-table").querySelector("tbody");
		table.innerHTML = "";


		for (const n in parsed) {
			let device = parsed[n];
			let row = table.insertRow();
			row.insertCell(0).innerHTML = device.IP;
			row.insertCell(1).innerHTML = device.Name;
			row.insertCell(2).innerHTML = device.IsOnline;
			row.insertCell(3).innerHTML = `<button onclick="this.getRootNode().host.removeDevice('${device.IP}')" style='font-weight:bold; color: var(--clr-red);'>-</button>`;
		}
	}

	removeDevice(ip) {
		fetch(`/jmod/removeDevice?JMOD-Source=${this.source}`, {
			method: "POST",
			header: {
				"Content-Type": "application/json"
			},
			body: JSON.stringify({ipAddress: ip})
		})
			.then(async res => {

			})
			.catch(err => {
				console.error(err);
				console.log(err);
				alert(`${this.source} Unable to remove device`);
			})
	}

	addDevice(form) {
		console.log(this);
		let ip = this.shadowRoot.getElementById("status-add-ip").value;
		let name = this.shadowRoot.getElementById("status-add-name").value;
		fetch(`/jmod/addDevice?JMOD-Source=${this.source}`, {
			method: "POST",
			header: {
				"Content-Type": "application/json"
			},
			body: JSON.stringify({ipAddress: ip, name: name})
		})
			.then(async res => {
				console.log(await res.text());
			})
			.catch(err => {
				console.error(err);
			})
	}
}
