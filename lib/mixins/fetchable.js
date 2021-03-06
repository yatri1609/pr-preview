"use strict";

const cache = require("../cache");
const request = require("request");
const urlencode = require("urlencode");
const mustache = require("mustache");
const postProcessor = require("../post-processor");
const fetchUrl = require("../fetch-url");
mustache.escape = v => v;

module.exports = (superclass) => class extends superclass {  
    getUrl(options) {
        if (this.pr.processor == "bikeshed") {  
            return this.getBikeshedUrl(options);
        }

        if (this.pr.processor == "respec") {
            return this.getRespecUrl(options);
        }

        throw new Error(`Unknown processor ${ this.pr.processor }`);
    }

    getBikeshedUrl(data) {
        let query = this.getQuery(data, urlencode);
        query = query ? "&" + query : ""
        return `https://api.csswg.org/bikeshed/?url=${ urlencode(this.github_url) }${ query }`;
    }

    getRespecUrl(data) {
        let query = this.getQuery(data);
        query = query ? "?" + query : ""
        return `https://labs.w3.org/spec-generator/?type=respec&url=${urlencode(this.rawgit_url + query)}`
    }

    get file_path() {
        return `${ this.owner }/${ this.repo }/${ this.sha }/${ this.pr.config.src_file }`;
    }

    get github_url() {
        return `https://raw.githubusercontent.com/${ this.file_path }`;
    }

    get rawgit_url() {
        return `https://cdn.rawgit.com/${ this.file_path }`;
    }
    
    getQuery(data, encode) {
        let params = this.pr.config.params || {};
        return Object.keys(params).map(k => {
            let tmpl = String(params[k]);
            let v = mustache.render(tmpl, data);
            return `${ k }=${ encode ? urlencode(v) : v }`;
        }).join("&");
    }

    urlOptions() {
        return {
            config:       this.pr.config,
            pull_request: this.pr.payload,
            owner:        this.owner,
            repo:         this.repo,
            branch:       this.ref,
            sha:          this.sha,
            short_sha:    this.short_sha,
            url:          this.cache_url
        };
    }
    
    fetch() {
        var url = this.getUrl(this.urlOptions());
        console.log(`Fetch: ${ url }`);
        var postProcess = postProcessor(this.pr.postProcessingConfig) || postProcessor.noop;
        return fetchUrl(url).then(postProcess);
    }
};