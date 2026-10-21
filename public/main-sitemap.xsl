<?xml version="1.0" encoding="UTF-8"?>
<!-- Natec Development · XML Sitemap stylesheet (layout in the style of Rank Math, colours from the Natec logo) -->
<xsl:stylesheet version="2.0"
	xmlns:html="http://www.w3.org/TR/REC-html40"
	xmlns:image="http://www.google.com/schemas/sitemap-image/1.1"
	xmlns:sitemap="http://www.sitemaps.org/schemas/sitemap/0.9"
	xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
	<xsl:output method="html" version="1.0" encoding="UTF-8" indent="yes"/>
	<xsl:template match="/">
		<html xmlns="http://www.w3.org/1999/xhtml" lang="en">
		<head>
			<title>XML Sitemap · Natec Development Ltd.</title>
			<meta http-equiv="Content-Type" content="text/html; charset=utf-8" />
			<meta name="viewport" content="width=device-width, initial-scale=1" />
			<meta name="robots" content="noindex, follow" />
			<link rel="icon" href="/favicon.png" />
			<style type="text/css">
				:root { --navy:#072F63; --navy-deep:#041A38; --red:#9B0707; --ivory:#F7F4EE; --ink:#1B2333; --muted:#5B6578; --line:rgba(7,47,99,0.12); }
				* { box-sizing: border-box; }
				body { margin: 0; font-family: "Jost", "Segoe UI", Roboto, Helvetica, Arial, sans-serif; font-size: 14px; color: var(--ink); background: var(--ivory); }
				a { color: var(--navy); text-decoration: none; }
				a:hover { color: var(--red); text-decoration: underline; }
				.topbar { height: 4px; background: var(--red); }
				#header { background: var(--navy); color: #fff; }
				#header .inner, #content { max-width: 1100px; margin: 0 auto; padding: 0 20px; }
				#header .inner { display: flex; align-items: center; gap: 16px; padding-top: 22px; padding-bottom: 22px; }
				#header img { height: 54px; background: #fff; border-radius: 10px; padding: 5px; }
				#header .brand { letter-spacing: .22em; font-size: 12px; opacity: .85; text-transform: uppercase; }
				#header h1 { margin: 4px 0 0; font-family: "Playfair Display", Georgia, serif; font-weight: 500; font-size: 30px; letter-spacing: -.01em; }
				#content { padding-top: 28px; padding-bottom: 48px; }
				.intro { background: #fff; border: 1px solid var(--line); border-left: 4px solid var(--red); border-radius: 12px; padding: 16px 20px; color: var(--muted); line-height: 1.7; margin: 0 0 22px; }
				.intro strong { color: var(--navy); }
				.count { display: inline-block; background: var(--navy); color: #fff; border-radius: 999px; padding: 2px 10px; font-weight: 600; font-size: 12px; margin-left: 4px; }
				.back { display: inline-block; margin: 0 0 14px; font-weight: 600; }
				table { width: 100%; border-collapse: separate; border-spacing: 0; background: #fff; border: 1px solid var(--line); border-radius: 12px; overflow: hidden; }
				th { background: var(--navy); color: #fff; text-align: left; font-weight: 600; font-size: 12px; letter-spacing: .08em; text-transform: uppercase; padding: 12px 16px; }
				td { padding: 11px 16px; border-top: 1px solid var(--line); vertical-align: top; }
				tr:nth-child(even) td { background: #FBF9F5; }
				tr:hover td { background: #F1EDE4; }
				td.num, th.num { text-align: right; white-space: nowrap; width: 1%; }
				td.date { white-space: nowrap; color: var(--muted); width: 1%; }
				td a { word-break: break-all; }
				.footer { margin-top: 22px; color: var(--muted); font-size: 12px; text-align: center; }
				.footer a { color: var(--red); }
				@media (max-width: 640px) { #header h1 { font-size: 24px; } th, td { padding: 10px; } td.date { white-space: normal; } }
			</style>
		</head>
		<body>
			<div class="topbar"></div>
			<div id="header">
				<div class="inner">
					<a href="/"><img src="/brand/natec-logo-transparent.png" alt="Natec Development Ltd." /></a>
					<div>
						<div class="brand">Natec Development Ltd.</div>
						<h1>XML Sitemap</h1>
					</div>
				</div>
			</div>
			<div id="content">
				<p class="intro">
					This is the XML Sitemap of <strong><a href="/">natecdev.com</a></strong>. It is made for search engines such as Google and Bing that follow the
					<a href="https://www.sitemaps.org/" target="_blank" rel="noopener">XML Sitemap standard</a>, and it lists the public pages of Natec Development Ltd.,
					real estate developer in Rajendrapur, Sreepur, Gazipur.
					<xsl:if test="count(sitemap:sitemapindex/sitemap:sitemap) &gt; 0"><br/>This sitemap index contains <span class="count"><xsl:value-of select="count(sitemap:sitemapindex/sitemap:sitemap)"/></span> sitemaps.</xsl:if>
					<xsl:if test="count(sitemap:urlset/sitemap:url) &gt; 0"><br/>This sitemap contains <span class="count"><xsl:value-of select="count(sitemap:urlset/sitemap:url)"/></span> URLs.</xsl:if>
				</p>

				<xsl:if test="count(sitemap:sitemapindex/sitemap:sitemap) &gt; 0">
					<table>
						<thead><tr><th>Sitemap</th><th>Last Modified</th></tr></thead>
						<tbody>
							<xsl:for-each select="sitemap:sitemapindex/sitemap:sitemap">
								<tr>
									<td><a href="{sitemap:loc}"><xsl:value-of select="sitemap:loc"/></a></td>
									<td class="date"><xsl:value-of select="concat(substring(sitemap:lastmod,0,11),' ',substring(sitemap:lastmod,12,5))"/></td>
								</tr>
							</xsl:for-each>
						</tbody>
					</table>
				</xsl:if>

				<xsl:if test="count(sitemap:urlset/sitemap:url) &gt; 0">
					<a class="back" href="/sitemap_index.xml">← Sitemap Index</a>
					<table>
						<thead><tr><th>URL</th><th class="num">Images</th><th>Last Mod.</th></tr></thead>
						<tbody>
							<xsl:for-each select="sitemap:urlset/sitemap:url">
								<tr>
									<td><a href="{sitemap:loc}"><xsl:value-of select="sitemap:loc"/></a></td>
									<td class="num"><xsl:value-of select="count(image:image)"/></td>
									<td class="date"><xsl:value-of select="concat(substring(sitemap:lastmod,0,11),' ',substring(sitemap:lastmod,12,5))"/></td>
								</tr>
							</xsl:for-each>
						</tbody>
					</table>
				</xsl:if>

				<p class="footer">© Natec Development Ltd. · <a href="/">Home</a> · <a href="/projects">Projects</a> · <a href="/contact">Contact</a></p>
			</div>
		</body>
		</html>
	</xsl:template>
</xsl:stylesheet>
