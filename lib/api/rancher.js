// xyOps API Layer - Rancher Integration
// Copyright (c) 2019 - 2026 PixlCore LLC
// Released under the BSD 3-Clause License.
// See the LICENSE.md file in this repository.

const assert = require("assert");
const Tools = require("pixl-tools");
const PixlRequest = require("pixl-request");

class RancherIntegration {
	
	api_get_rancher_clusters(args, callback) {
		// get list of all rancher cluster integrations
		var self = this;
		if (!this.requireMaster(args, callback)) return;
		
		this.loadSession(args, function(err, session, user) {
			if (err) return self.doError('session', err.message, callback);
			if (!self.requireValidUser(session, user, callback)) return;
			
			self.storage.listFind('global/rancher_clusters', { offset: 0, limit: 100 }, function(err, keys) {
				if (err) return self.doError('storage', err.message, callback);
				
				var clusters = [];
				if (keys && keys.length) {
					keys.forEach(function(key) {
						var cluster = self.storage.get(key);
						if (cluster) clusters.push(cluster);
					});
				}
				
				callback({
					code: 0,
					rows: clusters,
					list: { length: clusters.length }
				});
			});
		});
	}
	
	api_get_rancher_cluster(args, callback) {
		// get single rancher cluster config
		var self = this;
		var params = Tools.mergeHashes(args.params, args.query);
		if (!this.requireMaster(args, callback)) return;
		
		if (!this.requireParams(params, {
			id: /^[a-z0-9_]+$/
		}, callback)) return;
		
		this.loadSession(args, function(err, session, user) {
			if (err) return self.doError('session', err.message, callback);
			if (!self.requireValidUser(session, user, callback)) return;
			
			self.storage.get('global/rancher_clusters/' + params.id, function(err, cluster) {
				if (err || !cluster) return self.doError('rancher', "Cluster not found: " + params.id, callback);
				
				callback({ code: 0, cluster: cluster });
			});
		});
	}
	
	api_create_rancher_cluster(args, callback) {
		// create new rancher cluster integration
		var self = this;
		var params = args.params;
		if (!this.requireMaster(args, callback)) return;
		
		if (!params.id) params.id = Tools.generateShortID('rch');
		
		if (!this.requireParams(params, {
			id: /^[a-z0-9_]+$/,
			title: /\S/,
			url: /https?:\/\//,
			api_key: /\S/,
			api_secret: /\S/
		}, callback)) return;
		
		this.loadSession(args, function(err, session, user) {
			if (err) return self.doError('session', err.message, callback);
			if (!self.requireValidUser(session, user, callback)) return;
			if (!self.requirePrivilege(user, 'admin', callback)) return;
			
			params.url = params.url.replace(/\/$/, '');
			params.username = user.username || user.id;
			params.created = params.modified = Tools.timeNow(true);
			params.revision = 1;
			params.enabled = ('enabled' in params) ? params.enabled : true;
			
			self.logDebug(6, "Creating Rancher cluster: " + params.title, { id: params.id, url: params.url });
			
			self.storage.put('global/rancher_clusters/' + params.id, params, function(err) {
				if (err) return self.doError('rancher', "Failed to create cluster: " + err, callback);
				
				callback({ code: 0, cluster: params });
			});
		});
	}
	
	api_update_rancher_cluster(args, callback) {
		// update existing rancher cluster config
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
			
			self.storage.get('global/rancher_clusters/' + params.id, function(err, cluster) {
				if (err || !cluster) return self.doError('rancher', "Cluster not found: " + params.id, callback);
				
				if (params.title) cluster.title = params.title;
				if (params.url) cluster.url = params.url.replace(/\/$/, '');
				if ('enabled' in params) cluster.enabled = params.enabled;
				if (params.api_key) cluster.api_key = params.api_key;
				if (params.api_secret) cluster.api_secret = params.api_secret;
				
				cluster.modified = Tools.timeNow(true);
				cluster.revision = (cluster.revision || 0) + 1;
				
				self.logDebug(6, "Updating Rancher cluster: " + cluster.title, { id: params.id });
				
				self.storage.put('global/rancher_clusters/' + params.id, cluster, function(err) {
					if (err) return self.doError('rancher', "Failed to update cluster: " + err, callback);
					
					callback({ code: 0, cluster: cluster });
				});
			});
		});
	}
	
	api_delete_rancher_cluster(args, callback) {
		// delete rancher cluster config
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
			
			self.logDebug(6, "Deleting Rancher cluster: " + params.id);
			
			self.storage.delete('global/rancher_clusters/' + params.id, function(err) {
				if (err) return self.doError('rancher', "Failed to delete cluster: " + err, callback);
				
				callback({ code: 0 });
			});
		});
	}
	
	api_test_rancher_connection(args, callback) {
		// test rancher cluster connection
		var self = this;
		var params = args.params;
		if (!this.requireMaster(args, callback)) return;
		
		if (!this.requireParams(params, {
			url: /https?:\/\//,
			api_key: /\S/,
			api_secret: /\S/
		}, callback)) return;
		
		this.loadSession(args, function(err, session, user) {
			if (err) return self.doError('session', err.message, callback);
			if (!self.requireValidUser(session, user, callback)) return;
			
			var url = params.url.replace(/\/$/, '') + '/v3/clusters';
			var request = new PixlRequest({
				method: 'GET',
				url: url,
				headers: {
					'Authorization': 'Bearer ' + params.api_key + ':' + params.api_secret,
					'Accept': 'application/json'
				},
				timeout: 10000
			});
			
			request.send(function(err, resp, data) {
				if (err) {
					return self.doError('rancher', "Connection failed: " + err.message, callback);
				}
				
				if (resp.statusCode !== 200) {
					return self.doError('rancher', "API error: " + resp.statusCode, callback);
				}
				
				callback({
					code: 0,
					message: "Connection successful",
					clusters_count: (data.data ? data.data.length : 0)
				});
			});
		});
	}
	
	api_deploy_rancher_workload(args, callback) {
		// deploy workload to rancher cluster
		var self = this;
		var params = args.params;
		if (!this.requireMaster(args, callback)) return;
		
		if (!this.requireParams(params, {
			cluster_id: /^[a-z0-9_]+$/,
			project_id: /\S/,
			namespace: /\S/,
			workload_name: /\S/,
			image: /\S/
		}, callback)) return;
		
		this.loadSession(args, function(err, session, user) {
			if (err) return self.doError('session', err.message, callback);
			if (!self.requireValidUser(session, user, callback)) return;
			
			self.storage.get('global/rancher_clusters/' + params.cluster_id, function(err, cluster) {
				if (err || !cluster) return self.doError('rancher', "Cluster not found: " + params.cluster_id, callback);
				if (!cluster.enabled) return self.doError('rancher', "Cluster is disabled", callback);
				
				self.logDebug(6, "Deploying workload to Rancher", { 
					cluster: cluster.title, 
					workload: params.workload_name,
					image: params.image 
				});
				
				var deployPayload = {
					type: 'deployment',
					apiVersion: 'apps/v1',
					metadata: {
						name: params.workload_name,
						namespace: params.namespace
					},
					spec: {
						replicas: params.replicas || 1,
						template: {
							spec: {
								containers: [{
									name: params.workload_name,
									image: params.image
								}]
							}
						}
					}
				};
				
				var url = cluster.url.replace(/\/$/, '') + '/v3/projects/' + params.project_id + '/workloads';
				var request = new PixlRequest({
					method: 'POST',
					url: url,
					headers: {
						'Authorization': 'Bearer ' + cluster.api_key + ':' + cluster.api_secret,
						'Content-Type': 'application/json'
					},
					data: deployPayload,
					timeout: 15000
				});
				
				request.send(function(err, resp, data) {
					if (err) return self.doError('rancher', "Deployment failed: " + err.message, callback);
					if (resp.statusCode !== 200 && resp.statusCode !== 201) {
						return self.doError('rancher', "API error: " + resp.statusCode, callback);
					}
					
					var log_entry = {
						timestamp: Tools.timeNow(true),
						action: 'deploy',
						cluster: params.cluster_id,
						workload: params.workload_name,
						image: params.image,
						user: user.username || user.id,
						status: 'success'
					};
					self.storage.put('logs/rancher_deployments/' + Tools.generateUniqueID(12), log_entry, function() {});
					
					callback({
						code: 0,
						message: "Workload deployed successfully",
						workload_id: data.id
					});
				});
			});
		});
	}
	
	api_scale_rancher_workload(args, callback) {
		// scale rancher workload replicas
		var self = this;
		var params = args.params;
		if (!this.requireMaster(args, callback)) return;
		
		if (!this.requireParams(params, {
			cluster_id: /^[a-z0-9_]+$/,
			workload_id: /\S/,
			replicas: /^\d+$/
		}, callback)) return;
		
		this.loadSession(args, function(err, session, user) {
			if (err) return self.doError('session', err.message, callback);
			if (!self.requireValidUser(session, user, callback)) return;
			
			self.storage.get('global/rancher_clusters/' + params.cluster_id, function(err, cluster) {
				if (err || !cluster) return self.doError('rancher', "Cluster not found: " + params.cluster_id, callback);
				
				self.logDebug(6, "Scaling Rancher workload", { 
					workload: params.workload_id,
					replicas: params.replicas
				});
				
				var replicas = parseInt(params.replicas, 10);
				var updatePayload = {
					spec: {
						replicas: replicas
					}
				};
				
				var url = cluster.url.replace(/\/$/, '') + '/v3/workloads/' + params.workload_id;
				var request = new PixlRequest({
					method: 'PATCH',
					url: url,
					headers: {
						'Authorization': 'Bearer ' + cluster.api_key + ':' + cluster.api_secret,
						'Content-Type': 'application/json'
					},
					data: updatePayload,
					timeout: 15000
				});
				
				request.send(function(err, resp, data) {
					if (err) return self.doError('rancher', "Scale failed: " + err.message, callback);
					if (resp.statusCode !== 200) {
						return self.doError('rancher', "API error: " + resp.statusCode, callback);
					}
					
					callback({
						code: 0,
						message: "Workload scaled to " + replicas + " replicas"
					});
				});
			});
		});
	}
	
	api_get_rancher_workloads(args, callback) {
		// get list of workloads from rancher cluster
		var self = this;
		var params = Tools.mergeHashes(args.params, args.query);
		if (!this.requireMaster(args, callback)) return;
		
		if (!this.requireParams(params, {
			cluster_id: /^[a-z0-9_]+$/
		}, callback)) return;
		
		this.loadSession(args, function(err, session, user) {
			if (err) return self.doError('session', err.message, callback);
			if (!self.requireValidUser(session, user, callback)) return;
			
			self.storage.get('global/rancher_clusters/' + params.cluster_id, function(err, cluster) {
				if (err || !cluster) return self.doError('rancher', "Cluster not found: " + params.cluster_id, callback);
				
				var url = cluster.url.replace(/\/$/, '') + '/v3/workloads';
				var request = new PixlRequest({
					method: 'GET',
					url: url,
					headers: {
						'Authorization': 'Bearer ' + cluster.api_key + ':' + cluster.api_secret,
						'Accept': 'application/json'
					},
					timeout: 10000
				});
				
				request.send(function(err, resp, data) {
					if (err) return self.doError('rancher', "Failed to fetch workloads: " + err.message, callback);
					if (resp.statusCode !== 200) {
						return self.doError('rancher', "API error: " + resp.statusCode, callback);
					}
					
					callback({
						code: 0,
						workloads: (data.data || []),
						total: (data.data ? data.data.length : 0)
					});
				});
			});
		});
	}
}

module.exports = RancherIntegration;
