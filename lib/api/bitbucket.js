// xyOps API Layer - Bitbucket Integration
// Copyright (c) 2019 - 2026 PixlCore LLC
// Released under the BSD 3-Clause License.
// See the LICENSE.md file in this repository.

const assert = require("assert");
const Tools = require("pixl-tools");
const PixlRequest = require("pixl-request");

class BitbucketIntegration {

	api_get_bitbucket_configs(args, callback) {
		// get list of all bitbucket integrations
		var self = this;
		if (!this.requireMaster(args, callback)) return;

		this.loadSession(args, function(err, session, user) {
			if (err) return self.doError('session', err.message, callback);
			if (!self.requireValidUser(session, user, callback)) return;

			self.storage.listFind('global/bitbucket_configs', { offset: 0, limit: 100 }, function(err, keys) {
				if (err) return self.doError('storage', err.message, callback);

				var configs = [];
				if (keys && keys.length) {
					keys.forEach(function(key) {
						var config = self.storage.get(key);
						if (config) configs.push(config);
					});
				}

				callback({
					code: 0,
					rows: configs,
					list: { length: configs.length }
				});
			});
		});
	}

	api_get_bitbucket_config(args, callback) {
		// get single bitbucket config
		var self = this;
		var params = Tools.mergeHashes(args.params, args.query);
		if (!this.requireMaster(args, callback)) return;

		if (!this.requireParams(params, {
			id: /^[a-z0-9_]+$/
		}, callback)) return;

		this.loadSession(args, function(err, session, user) {
			if (err) return self.doError('session', err.message, callback);
			if (!self.requireValidUser(session, user, callback)) return;

			self.storage.get('global/bitbucket_configs/' + params.id, function(err, config) {
				if (err || !config) return self.doError('bitbucket', "Config not found: " + params.id, callback);

				callback({ code: 0, config: config });
			});
		});
	}

	api_create_bitbucket_config(args, callback) {
		// create new bitbucket integration
		var self = this;
		var params = args.params;
		if (!this.requireMaster(args, callback)) return;

		if (!params.id) params.id = Tools.generateShortID('bbc');

		if (!this.requireParams(params, {
			id: /^[a-z0-9_]+$/,
			title: /\S/,
			workspace: /\S/,
			client_id: /\S/,
			client_secret: /\S/
		}, callback)) return;

		this.loadSession(args, function(err, session, user) {
			if (err) return self.doError('session', err.message, callback);
			if (!self.requireValidUser(session, user, callback)) return;
			if (!self.requirePrivilege(user, 'admin', callback)) return;

			params.username = user.username || user.id;
			params.created = params.modified = Tools.timeNow(true);
			params.revision = 1;
			params.enabled = ('enabled' in params) ? params.enabled : true;

			self.logDebug(6, "Creating Bitbucket config: " + params.title, { id: params.id, workspace: params.workspace });

			self.storage.put('global/bitbucket_configs/' + params.id, params, function(err) {
				if (err) return self.doError('bitbucket', "Failed to create config: " + err, callback);

				callback({ code: 0, config: params });
			});
		});
	}

	api_update_bitbucket_config(args, callback) {
		// update existing bitbucket config
		var self = this;
		var params = args.params;
		if (!this.requireMaster(args, callback)) return;

		if (!this.requireParams(params, {
			id: /^[a-z0-9_]+$/
		}, callback)) return;

		this.loadSession(args, function(err, session, user) {
			if (err) return self.doError('session', err.message, callback);
			if (!self.requireValidUser(session, user, callback)) return;
			if (!self.requirePrivilege(user, 'admin', callback)) return;

			self.storage.get('global/bitbucket_configs/' + params.id, function(err, config) {
				if (err || !config) return self.doError('bitbucket', "Config not found: " + params.id, callback);

				// update allowed fields
				if (params.title) config.title = params.title;
				if ('enabled' in params) config.enabled = params.enabled;
				if (params.client_id) config.client_id = params.client_id;
				if (params.client_secret) config.client_secret = params.client_secret;
				if (params.webhook_secret) config.webhook_secret = params.webhook_secret;

				config.modified = Tools.timeNow(true);
				config.revision = (config.revision || 0) + 1;

				self.logDebug(6, "Updating Bitbucket config: " + config.title, { id: params.id });

				self.storage.put('global/bitbucket_configs/' + params.id, config, function(err) {
					if (err) return self.doError('bitbucket', "Failed to update config: " + err, callback);

					callback({ code: 0, config: config });
				});
			});
		});
	}

	api_delete_bitbucket_config(args, callback) {
		// delete bitbucket config
		var self = this;
		var params = Tools.mergeHashes(args.params, args.query);
		if (!this.requireMaster(args, callback)) return;

		if (!this.requireParams(params, {
			id: /^[a-z0-9_]+$/
		}, callback)) return;

		this.loadSession(args, function(err, session, user) {
			if (err) return self.doError('session', err.message, callback);
			if (!self.requireValidUser(session, user, callback)) return;
			if (!self.requirePrivilege(user, 'admin', callback)) return;

			self.logDebug(6, "Deleting Bitbucket config: " + params.id);

			self.storage.delete('global/bitbucket_configs/' + params.id, function(err) {
				if (err) return self.doError('bitbucket', "Failed to delete config: " + err, callback);

				callback({ code: 0 });
			});
		});
	}

	api_test_bitbucket_connection(args, callback) {
		// test bitbucket connection
		var self = this;
		var params = args.params;
		if (!this.requireMaster(args, callback)) return;

		if (!this.requireParams(params, {
			workspace: /\S/,
			client_id: /\S/,
			client_secret: /\S/
		}, callback)) return;

		this.loadSession(args, function(err, session, user) {
			if (err) return self.doError('session', err.message, callback);
			if (!self.requireValidUser(session, user, callback)) return;

			// Test API connection
			var request = new PixlRequest({
				method: 'GET',
				url: 'https://api.bitbucket.org/2.0/workspaces/' + params.workspace,
				auth: params.client_id + ':' + params.client_secret,
				timeout: 10000
			});

			request.send(function(err, resp, data) {
				if (err) {
					return self.doError('bitbucket', "Connection failed: " + err.message, callback);
				}

				if (resp.statusCode !== 200) {
					return self.doError('bitbucket', "API error: " + resp.statusCode + " " + (data ? data.error.message : 'Unknown error'), callback);
				}

				callback({
					code: 0,
					message: "Connection successful",
					workspace_name: data.name || params.workspace
				});
			});
		});
	}

	api_sync_bitbucket_issues(args, callback) {
		// sync issues from bitbucket to xyops tickets
		var self = this;
		var params = args.params;
		if (!this.requireMaster(args, callback)) return;

		if (!this.requireParams(params, {
			config_id: /^[a-z0-9_]+$/,
			repo: /\S/
		}, callback)) return;

		this.loadSession(args, function(err, session, user) {
			if (err) return self.doError('session', err.message, callback);
			if (!self.requireValidUser(session, user, callback)) return;

			self.storage.get('global/bitbucket_configs/' + params.config_id, function(err, config) {
				if (err || !config) return self.doError('bitbucket', "Config not found: " + params.config_id, callback);

				self.logDebug(6, "Syncing Bitbucket issues", { repo: params.repo, workspace: config.workspace });

				// Fetch issues from Bitbucket API
				var request = new PixlRequest({
					method: 'GET',
					url: 'https://api.bitbucket.org/2.0/repositories/' + config.workspace + '/' + params.repo + '/issues?state=new,open',
					auth: config.client_id + ':' + config.client_secret,
					timeout: 15000
				});

				request.send(function(err, resp, data) {
					if (err) return self.doError('bitbucket', "Failed to fetch issues: " + err.message, callback);
					if (resp.statusCode !== 200) return self.doError('bitbucket', "API error: " + resp.statusCode, callback);

					var synced_count = 0;
					if (data.values && data.values.length) {
						data.values.forEach(function(issue) {
							// Create ticket from issue
							var ticket = {
								id: 'bitbucket_' + issue.id,
								title: issue.title,
								description: issue.content.raw,
								status: 'open',
								source: 'bitbucket',
								source_id: issue.id,
								created: issue.created_on,
								updated: issue.updated_on
							};

							self.storage.put('tickets/bitbucket_' + issue.id, ticket, function(err) {
								if (!err) synced_count++;
							});
						});
					}

					callback({
						code: 0,
						synced: synced_count,
						total: (data.values ? data.values.length : 0)
					});
				});
			});
		});
	}
}

module.exports = BitbucketIntegration;
