import app from '../hono/hono';
import result from '../model/result';
import appConfigService from '../service/app-config-service';

app.get('/app/config', async (c) => {
	const config = await appConfigService.getPublicConfig(c);
	return c.json(result.ok(config));
});

app.get('/app/templates', async (c) => {
	const templates = await appConfigService.getTemplates(c);
	return c.json(result.ok(templates));
});

app.get('/app/manifest', async (c) => {
	const manifest = await appConfigService.getManifest(c);
	return c.json(result.ok(manifest));
});

app.get('/app/admin/config', async (c) => {
	const config = await appConfigService.getAdminConfig(c);
	return c.json(result.ok(config));
});

app.put('/app/admin/config/set', async (c) => {
	const config = await appConfigService.saveConfig(c, await c.req.json());
	return c.json(result.ok(config));
});

app.get('/app/admin/templates', async (c) => {
	const templates = await appConfigService.getTemplates(c);
	return c.json(result.ok(templates));
});

app.put('/app/admin/templates/set', async (c) => {
	const templates = await appConfigService.saveTemplates(c, await c.req.json());
	return c.json(result.ok(templates));
});

app.get('/app/admin/manifest', async (c) => {
	const manifest = await appConfigService.getManifest(c);
	return c.json(result.ok(manifest));
});

app.put('/app/admin/manifest/set', async (c) => {
	const manifest = await appConfigService.saveManifest(c, await c.req.json());
	return c.json(result.ok(manifest));
});
