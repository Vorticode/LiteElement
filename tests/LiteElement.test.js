// Define document object to allow us to run all modules from the command line.
if (!globalThis.document) {
	(async () => {
		var jsdom = await import('https://dev.jspm.io/jsdom');
		globalThis.document = new jsdom.JSDOM(`<!DOCTYPE html>`).window.document;
		let module = import('https://deno.land/std@0.73.0/testing/asserts.ts');
		
		// Sleep is required for JSDom to resolve its promises before tests begin.
		await new Promise(resolve => setTimeout(resolve, 10));
	})()
}

import {assert, assertEquals} from './Testimony.js';
import LiteElement from '../LiteElement.js';

// Remove all whitespace between nodes.
function collapse(html, tokens) {
	return html[0].trim()
		.replace(/>\s+/g,'>')
		.replace(/\s+</g,'<');
}

function createEl(html, trim=true) {
	let template = document.createElement('div');
	template.innerHTML = html.trim();
	return template.removeChild(template.firstChild);
};




Deno.test('LiteElement.ids', () => {
	class I extends LiteElement {
		//div = null;

		constructor() {
			super();
		}
	}
	I.html = `
		<i-1>
			<div id="div">hi</div>
		</i-1>`;

	let i = new I();
	assert(i.div instanceof HTMLElement);
});

Deno.test('LiteElement.attributes', () => {
	class A extends LiteElement {
		constructor() {
			super();
		}
	}
	A.html = `
		<A-1 style="color: green">
			<div id="div">hi</div>
		</A-1>`; // Make sure capital names are converted to lower case.

	let a = new A();
	assertEquals(a.getAttribute('style'), 'color: green');

	let a2 = createEl('<div><a-1></a-1>').childNodes[0];
	document.body.appendChild(a2); // Doesn't have attribute until added to body.
	assertEquals(a2.getAttribute('style'), 'color: green');
	a2.remove();

	let a3 = createEl('<div><a-1 style="color: red"></a-1>').childNodes[0];
	document.body.appendChild(a3); // Doesn't have attribute until added to body.
	assertEquals(a3.getAttribute('style'), 'color: red');
	a3.remove();

});

Deno.test('LiteElement.shadowDom', () => {
	class S extends LiteElement {}
	S.html = collapse`
		<s-1 shadow>
			<div>hi</div>
		</s-1>`;

	let s = new S();
	assert(s.shadowRoot);
	assertEquals(s.shadowRoot.firstChild.tagName, 'DIV');
});

Deno.test('LiteElement.events', () => {
	var clicked = {};
	class E extends LiteElement {
		onClick(event, el) {
			clicked.event = event;
			clicked.el = el;
		}
	}
	E.html = `
		<e-1>
			<div id="btn" onclick="this.onClick(event, el)">hi</div>
		</e-1>`;
	let e = new E();
	e.btn.dispatchEvent(new MouseEvent('click', {view: window, bubbles: true, cancelable: true}));

	assertEquals(clicked.event.type, 'click')
	assertEquals(clicked.el, e.btn);
	//assertEquals(a.outerHTML, '<a-1><p><slot>test</slot></p></a-1>');
});

Deno.test('LiteElement.slot', () => {
	class A extends LiteElement {}
	A.html = `<l-1><p><slot></slot></p></l-1>`;
	let a = createEl(`<l-1>test</l-1>`);
	assertEquals(a.outerHTML, '<l-1><p><slot>test</slot></p></l-1>');
});

Deno.test('LiteElement.slots', () => {
	class A extends LiteElement {}
	A.html = collapse`
		<a-2>
			<p><slot></slot></p>
			<slot></slot>
		</a-2>`;

	let a = createEl(`<a-2>test</a-2>`);
	assertEquals(a.outerHTML, collapse`
		<a-2>
			<p><slot>test</slot></p>
			<slot>test</slot>
		</a-2>`);
});

Deno.test('LiteElement.namedSlot', () => {
	class A extends LiteElement {}
	A.html = `<a-3>begin<slot name="slot1"></slot>end</a-3>`;

	let a = createEl(`<a-3><div slot="slot1">content</div></a-3>`);
	assertEquals(a.outerHTML, '<a-3>begin<slot name="slot1">content</slot>end</a-3>');
});

Deno.test('LiteElement.benchmark', () => {
	class A extends LiteElement {}
	A.html = `
		<b-element>
			<div id="one">Hi</div>
		</b-element>`;


	let start = new Date();
	let els = [];
	for (let i=0; i<1000; i++) {
		let el = new A();
		document.body.appendChild(el);
		els.push(el);
	}
	let time = (new Date() - start);

	for (let el of els)
		el.remove();


	return '1k els in ' + time + 'ms';
});

