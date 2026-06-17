'use strict';
'require view';
'require rpc';
'require ui';
'require poll';

var callConfig = rpc.declare({
	object: 'sb',
	method: 'config',
	expect: { '': {} }
});

var callValidate = rpc.declare({
	object: 'sb',
	method: 'validate',
	params: [ 'content' ],
	expect: { '': {} }
});

var callSave = rpc.declare({
	object: 'sb',
	method: 'save',
	params: [ 'content' ],
	expect: { '': {} }
});

var callStatus = rpc.declare({
	object: 'sb',
	method: 'status',
	expect: { '': {} }
});

var callService = rpc.declare({
	object: 'sb',
	method: 'service',
	params: [ 'action' ],
	expect: { '': {} }
});

var callSpeedtest = rpc.declare({
	object: 'sb',
	method: 'speedtest',
	params: [ 'target' ],
	expect: { '': {} }
});

var isReadonlyView = !L.hasViewPermission() || null;

return view.extend({
	load: function() {
		return Promise.all([
			callConfig(),
			callStatus()
		]);
	},

	renderStatusBadge: function(status) {
		var running = status && status.running;

		return E('span', {
			'class': 'label %s'.format(running ? 'notice' : 'warning')
		}, running ? _('Running') : _('Stopped'));
	},

	renderStatusFields: function(status) {
		status = status || {};

		return [
			E('div', { 'class': 'cbi-value' }, [
				E('label', { 'class': 'cbi-value-title' }, _('Service status')),
				E('div', { 'class': 'cbi-value-field' }, [
					this.renderStatusBadge(status),
					' ',
					E('span', {}, status.status || ''),
					status.pid ? E('span', {}, ' PID: %s'.format(status.pid)) : ''
				])
			]),
			E('div', { 'class': 'cbi-value' }, [
				E('label', { 'class': 'cbi-value-title' }, _('Autostart')),
				E('div', { 'class': 'cbi-value-field' }, status.enabled ? _('Enabled') : _('Disabled'))
			]),
			E('div', { 'class': 'cbi-value' }, [
				E('label', { 'class': 'cbi-value-title' }, _('Version')),
				E('div', { 'class': 'cbi-value-field' }, status.version || '-')
			]),
			E('div', { 'class': 'cbi-value' }, [
				E('label', { 'class': 'cbi-value-title' }, _('Config file')),
				E('div', { 'class': 'cbi-value-field' }, status.config_path || '-')
			])
		];
	},

	updateStatus: function(status) {
		var node = document.getElementById('sb-status');

		if (!node)
			return;

		node.innerHTML = '';

		var fields = this.renderStatusFields(status);
		for (var i = 0; i < fields.length; i++)
			node.appendChild(fields[i]);
	},

	refreshStatus: function() {
		return callStatus().then(L.bind(this.updateStatus, this));
	},

	handleService: function(action) {
		return callService(action).then(L.bind(function(res) {
			if (!res.ok)
				ui.addNotification(null, E('p', res.output || _('Command failed.')), 'danger');
			else
				ui.addNotification(null, E('p', _('Service command completed.')), 'info');

			this.updateStatus(res.status);
		}, this)).catch(function(err) {
			ui.addNotification(null, E('p', err.message || err), 'danger');
		});
	},

	handleReloadConfig: function() {
		return callConfig().then(function(cfg) {
			document.getElementById('sb-config').value = cfg.content || '';
			ui.addNotification(null, E('p', _('Configuration reloaded from disk.')), 'info');
		});
	},

	handleValidate: function() {
		var content = document.getElementById('sb-config').value || '';

		return callValidate(content).then(function(res) {
			ui.addNotification(null, E('pre', { 'style': 'white-space:pre-wrap' }, res.message || ''), res.valid ? 'info' : 'danger');
		});
	},

	handleConfigSave: function(restart) {
		var content = document.getElementById('sb-config').value || '';

		return callSave(content).then(L.bind(function(res) {
			if (!res.ok) {
				ui.addNotification(null, E('pre', { 'style': 'white-space:pre-wrap' }, res.validation ? res.validation.message : _('Save failed.')), 'danger');
				return;
			}

			ui.addNotification(null, E('p', _('Configuration saved.')), 'info');

			if (restart)
				return this.handleService('restart');
		}, this));
	},

	setSpeedResult: function(target, result) {
		var cell = document.getElementById('sb-speed-' + target);

		if (!cell)
			return;

		cell.innerHTML = '';

		if (!result || !result.ok) {
			cell.appendChild(E('span', { 'class': 'label warning' }, _('Failed')));
			if (result && result.output)
				cell.appendChild(E('pre', { 'style': 'white-space:pre-wrap; margin-top:.5em' }, result.output));
			return;
		}

		cell.appendChild(E('span', { 'class': 'label notice' }, _('%sms').format(result.latency_ms)));
		cell.appendChild(E('span', {}, ' HTTP %s'.format(result.http_code || '-')));
		if (result.remote_ip)
			cell.appendChild(E('span', {}, ' %s'.format(result.remote_ip)));
	},

	handleSpeedtest: function(target, ev) {
		var btn = ev.currentTarget;
		var cell = document.getElementById('sb-speed-' + target);

		btn.disabled = true;

		if (cell) {
			cell.innerHTML = '';
			cell.appendChild(E('span', { 'class': 'spinning' }, _('Testing...')));
		}

		return callSpeedtest(target).then(L.bind(function(res) {
			this.setSpeedResult(target, res);
		}, this)).catch(L.bind(function(err) {
			this.setSpeedResult(target, { ok: false, output: err.message || err });
		}, this)).finally(function() {
			btn.disabled = false;
		});
	},

	renderSpeedRow: function(target, title, mode) {
		return E('tr', { 'class': 'tr' }, [
			E('td', { 'class': 'td left' }, title),
			E('td', { 'class': 'td left' }, mode),
			E('td', { 'class': 'td left', 'id': 'sb-speed-' + target }, '-'),
			E('td', { 'class': 'td right' }, E('button', {
				'class': 'btn cbi-button-action',
				'click': ui.createHandlerFn(this, 'handleSpeedtest', target)
			}, _('Test')))
		]);
	},

	render: function(data) {
		var cfg = data[0] || {};
		var status = data[1] || {};
		var viewNode = E('div', { 'class': 'cbi-map' }, [
			E('h2', _('sing-box')),
			E('div', { 'class': 'cbi-section', 'id': 'sb-status' }, this.renderStatusFields(status)),
			E('div', { 'class': 'cbi-section' }, [
				E('h3', _('Service control')),
				E('div', { 'class': 'cbi-page-actions' }, [
					E('button', { 'class': 'btn cbi-button-positive', 'click': ui.createHandlerFn(this, 'handleService', 'start'), 'disabled': isReadonlyView }, _('Start')),
					' ',
					E('button', { 'class': 'btn cbi-button-negative', 'click': ui.createHandlerFn(this, 'handleService', 'stop'), 'disabled': isReadonlyView }, _('Stop')),
					' ',
					E('button', { 'class': 'btn cbi-button-action', 'click': ui.createHandlerFn(this, 'handleService', 'restart'), 'disabled': isReadonlyView }, _('Restart')),
					' ',
					E('button', { 'class': 'btn cbi-button-action', 'click': ui.createHandlerFn(this, 'refreshStatus') }, _('Refresh'))
				])
			]),
			E('div', { 'class': 'cbi-section' }, [
				E('h3', _('Configuration')),
				E('textarea', {
					'id': 'sb-config',
					'style': 'width:100%; min-height:34em; font-family:monospace; white-space:pre',
					'wrap': 'off',
					'disabled': isReadonlyView
				}, cfg.content || ''),
				E('div', { 'class': 'cbi-page-actions' }, [
					E('button', { 'class': 'btn cbi-button-neutral', 'click': ui.createHandlerFn(this, 'handleReloadConfig') }, _('Reload')),
					' ',
					E('button', { 'class': 'btn cbi-button-action', 'click': ui.createHandlerFn(this, 'handleValidate') }, _('Validate')),
					' ',
					E('button', { 'class': 'btn cbi-button-save', 'click': ui.createHandlerFn(this, 'handleConfigSave', false), 'disabled': isReadonlyView }, _('Save')),
					' ',
					E('button', { 'class': 'btn cbi-button-apply', 'click': ui.createHandlerFn(this, 'handleConfigSave', true), 'disabled': isReadonlyView }, _('Save & Restart'))
				])
			]),
			E('div', { 'class': 'cbi-section' }, [
				E('h3', _('Speed test')),
				E('table', { 'class': 'table' }, [
					E('tr', { 'class': 'tr table-titles' }, [
						E('th', { 'class': 'th left' }, _('Target')),
						E('th', { 'class': 'th left' }, _('Mode')),
						E('th', { 'class': 'th left' }, _('Result')),
						E('th', { 'class': 'th right' }, '')
					]),
					this.renderSpeedRow('baidu', 'Baidu', _('Direct')),
					this.renderSpeedRow('google', 'Google', _('Proxy')),
					this.renderSpeedRow('github', 'GitHub', _('Proxy'))
				])
			])
		]);

		poll.add(L.bind(this.refreshStatus, this), 5);

		return viewNode;
	},

	handleSaveApply: null,
	handleSave: null,
	handleReset: null
});
