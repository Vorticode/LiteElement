
/**
 * LiteElement.js
 * License: MIT
 *
 * A class for creating Html web components.  Features:
 * 1. Automatically create element from a class defined with html.  Attributes are copied from the instantiation to the created element.
 * 2. Elements with id or data-id attributes become properties on the class instance.
 * 3. on* events are rewritten to understand "this" as the class instance, and "el" as the element they're added to.
 * 4. Elements with attribute 'shadow' become shadow DOM.
 * 5. Slots
 *
 * When constructing an instance, the call order is parent constructor, child field, child constructor.
 *
 * Possible future todos:
 * 1. pass attributes as constructor args?  How?
 * 2. More slot testing.
 *
 * Use these settings for Terser mangle:
 * mangle: {
 *		reserved: ['event'],
 *		eval: true,
 *		properties: { regex: /_$/ }
 *	}
 *
 * To detect when element is added to the DOM:
 * let observer = new MutationObserver(mutations => {
 * 		if (mutations[0].addedNodes[0] === this || document.body.contains(this)) {
 * 			observer.disconnect();
 * 			this.onFirstInsert();
 * 		}
 * 	});
 * 	observer.observe(document.body, {childList: true, subtree: true}); */
class LiteElement extends HTMLElement {

	constructor() {
		super();
		let constructor = this.constructor;
		let slotContent = {};// Map from slot name to slot content.
		let originalHtml = this.innerHTML;

		// 0. Find Slot content.
		//    Find slots within where the element is created.
		if (constructor.hasSlots_)
			for (let el of this.querySelectorAll('[slot]'))
				//slotContent[el.getAttribute('slot')] = el.innerHTML;
				slotContent[el.slot] = el.innerHTML;

		// 1. Attributes
		//    Copy them from the constructor to our instance, if the instance hasn't defined them.
		for (let name in constructor.attribs_)
			if (!this.hasAttribute(name))
				this.setAttribute(name, constructor.attribs_[name]);

		// 2. Child Elements
		this.innerHTML = ''; // remove old children
		for (let child of constructor.children_) // Bencmarking shows this about twice as fast as just setting children from innerHTML.
			this.append(child.cloneNode(true)); // And this loop is faster than using append() and map().

		// 3. Create events
		//    Find all on... attributes, remove them, and addEventListener their corresponding event.
		//    This allows them to use the "this" context to refer to the class instead of their own element.
		if (constructor.hasEvents_)
			LiteElement.activateEvents_(this, this);

		// 4. Assign ids
		for (let el of this.querySelectorAll('[id], [data-id]')) {
			if (LiteElement.getLiteParent(el) === this) {
				let id = el.id || el.dataset.id;
				//#IFDEV
				if (this[id])
					throw new Error(`Can't create new property on <${this.tagName.toLowerCase()}> via id="${id}" because the ${id} property already has a value.`);
				//#ENDIF

				this[id] = el; // for when multiple instances will be created that don't have the id elements within shadow dom.
			}
		}

		// 5. Slots
		//    Must be before shadow dom for querySelector to work.
		if (constructor.hasSlots_)
			for (let slot of this.querySelectorAll('slot'))
				//slot.innerHTML = slotContent[slot.getAttribute('name')] || originalHtml;
				slot.innerHTML = slotContent[slot.name] || originalHtml;

		// 6. Create shadow DOM.
		//    Replace any instance of <shadow></shadow> with an actual shadow DOM.
		if (constructor.hasShadow_) {
			let shadows = [...this.querySelectorAll('[shadow]')];
			if ('shadow' in this.attributes)
				shadows.push(this);

			for (let shadow of shadows) {
				if (!shadow.shadowRoot) { // We check b/c one LiteElement embedded within another can have it's shadow attribute applied twice.
					shadow.attachShadow({mode: shadow.getAttribute('shadow') || 'open'});
					shadow.shadowRoot.append(...shadow.childNodes);
				}
			}
		}
	}

	/**
	 * Create a new HTMLElement or Node from an html string, with events bound to this LiteElement.
	 * @param html {string}
	 * @param trim {boolean}
	 * @returns {HTMLElement|Node} */
	createEl(html, trim=true) {
		let el = createEl(html, trim);
		LiteElement.activateEvents_(this, el);
		return el;
	}
}


/**
 *
 * @param el {HTMLElement|Node}
 * @returns {LiteElement} */
LiteElement.getLiteParent = el => {
	while ((el = el.parentNode))
		if (el instanceof LiteElement)
			return el;
}

/**
 *
 * @param el {HTMLElement}
 * @returns {{}} */
LiteElement.getValues = el => {
	let result = {};
	for (let input of (el.shadowRoot || el).querySelectorAll('[name]')) {
		let name = input.getAttribute('name');
		if (!['false', null].includes(input.getAttribute('contentEditable')))
			var val =  input.innerHTML;
		else if (input.type === 'checkbox')
			val = input.checked
		else
			val = input.value

		if (name in result) // Make array
			result[name] = [result[name], val].flat();
		else
			result[name] = val;
	}
	return result;
}

/**
 * @param el {HTMLElement}
 * @param values {object} */
LiteElement.setValues = (el, values) => {
	el = el.shadowRoot || el;
	for (let name in values)
		for (let input of el.querySelectorAll('[name="'+name+'"]'))
			if (!['false', null].includes(input.getAttribute('contentEditable')))
				input.innerHTML = values[name];
			else if (input.type === 'checkbox')
				input.checked = values[name];
			else
				input.value = values[name];

}

/**
 * Activate all event attributes on the given html, binding the "this" variable in the event code to the parent LiteElement.
 * Separated so we can activate events on dynamically added children.
 * @param liteElement {LiteElement}
 * @param el {HTMLElement} */
LiteElement.activateEvents_ = (liteElement, el) => {
	[el, ...el.querySelectorAll('*')].map(el =>
		[...el.attributes].filter(isEvent_).map(attr =>
			//el.removeAttribute(attr.name); // no need to remove it.
			el[attr.name] = e => // e.g. el.onclick = ...
				(new Function('event', 'el', attr.value)).bind(liteElement)(e, el) // put "event", "el", and "this" in scope for the event code.
		)
	);
}

Object.defineProperty(LiteElement, 'html', {
	/**
	 * Execultes only once per class definition, not instantiation. */
	set: function(html) {
		// Parse out the inner html
		referenceDiv_.innerHTML = html.trim();
		let el = referenceDiv_.firstChild
		this.children_ = el.childNodes;

		// Save features to create in constructor
		// Calculating these once redues the time it takes to create each instance.
		this.hasSlots_ = el.querySelector('slot');
		this.hasEvents_ = [...referenceDiv_.querySelectorAll('*')].filter(el =>
			[...el.attributes].filter(isEvent_).length
		).length;
		this.hasShadow_ = referenceDiv_.querySelector('[shadow]');
		this.ids_ = [...referenceDiv_.querySelectorAll('*')]

		/** @type {object<string, string>} Save attributes*/
		this.attribs_ = {};
		for (let attr of el.attributes)
			this.attribs_[attr.name] = attr.value;

		// Define custom element tag.
		customElements.define(el.tagName.toLowerCase(), this);
	}
});

let isEvent_ = attr => attr.name.startsWith('on') && attr.name in referenceDiv_; // Having this separate increases the gzip size by 4 bytes.
let template_ = document.createElement('template');
let referenceDiv_ = document.createElement('div');
let createElCache_ = {};

/**
 * @param html {string|HTMLTemplateElement}
 * @param trim {boolean=true}
 * @return {HTMLElement|Node} */
function createEl(html, trim = true) {
	if (html.tagName === 'TEMPLATE') {
		if (trim)
			return html.content.children[0].cloneNode(true);
		else
			return html.content.firstChild.cloneNode(true);
	}


	// Get from cache
	if (trim)
		html = html.trim();
	let existing = createElCache_[html];
	if (existing)
		return existing.cloneNode(true);

	// Create
	template_.innerHTML = html;

	// Cache
	// We only cache the html if there are no slots.
	// Because if we use cloneNode with a custom element that has slots, it will take all of the regular, non-slot
	// children of the element and insert them into the slot.
	let c = template_.content;
	if (!c.querySelector('slot'))
		createElCache_[html] = c.firstChild.cloneNode(true);

	return c.removeChild(c.firstChild);
}




export default LiteElement;