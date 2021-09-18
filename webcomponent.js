class extends HTMLElement  {
	constructor() {
		super();
		
		this.attachShadow({mode: "open"});
	}

	init(source, config) {
		this.source = source;
		this.config = config;

		this.shadowRoot.innerHTML = `
<link rel="stylesheet" href="/assets/standard.css"/>
<div class="jmod-wrapper">
	<div>
	<h1>Hello</h1>
</div>
		`
	}
}
