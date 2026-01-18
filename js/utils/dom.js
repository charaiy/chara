/**
 * js/utils/dom.js
 * DOM Manipulation Helpers
 * Encapsulates lower-level DOM operations
 */

window.DOM = {
    /**
     * Short for document.querySelector
     */
    $: function (selector, scope = document) {
        return scope.querySelector(selector);
    },

    /**
     * Short for document.querySelectorAll
     */
    $$: function (selector, scope = document) {
        return Array.from(scope.querySelectorAll(selector));
    },

    /**
     * Create an element with options
     * @param {string} tag 
     * @param {object} options { className, text, html, attributes, children }
     */
    create: function (tag, options = {}) {
        const el = document.createElement(tag);

        if (options.className) {
            if (Array.isArray(options.className)) {
                el.classList.add(...options.className);
            } else {
                el.className = options.className;
            }
        }

        if (options.text) el.textContent = options.text;
        if (options.html) el.innerHTML = options.html;

        if (options.attributes) {
            Object.entries(options.attributes).forEach(([key, val]) => {
                el.setAttribute(key, val);
            });
        }

        if (options.children) {
            options.children.forEach(child => {
                if (child) el.appendChild(child);
            });
        }

        return el;
    },

    /**
     * Safely remove an element
     */
    remove: function (el) {
        if (el && el.parentNode) {
            el.parentNode.removeChild(el);
        }
    }
};
