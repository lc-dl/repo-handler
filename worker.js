export default {
  async fetch(request, env, ctx) {
    if (request.method !== "POST") {
      return new Response("Send repo.json via POST", { status: 405 });
    }

    try {
      const repo = await request.json();

      if (!repo.url) {
        return new Response("Invalid repo.json (missing 'url')", { status: 400 });
      }

      const appsUrl = repo.url + "apps.json";
      const appsRes = await fetch(appsUrl);
      const appsJson = await appsRes.json();

      let vcfEntries = [];

      for (const key of Object.keys(appsJson)) {
        const { name, bundleID } = appsJson[key];
        const appJsonUrl = `${repo.url}apps/${bundleID}.json`;

        try {
          const appRes = await fetch(appJsonUrl);
          const appData = await appRes.json();

          const iconUrl = appData.icon;
          const iconRes = await fetch(iconUrl, {
            cf: { image: { width: 64, height: 64, fit: "cover" } }
          });

          const buffer = await iconRes.arrayBuffer();
          const base64 = btoa(String.fromCharCode(...new Uint8Array(buffer)));
          
          const vcfEntry = [
            "BEGIN:VCARD",
            `N;CHARSET=utf-8:${name};;;;`,
            `ORG;CHARSET=utf-8:${bundleID};`,
            `PHOTO;ENCODING=b:${base64}`,
            "END:VCARD"
          ].join("\n");

          vcfEntries.push(vcfEntry);
        } catch (err) {
          console.error(`Error processing ${bundleID}:`, err);
        }
      }

      const vcfFile = vcfEntries.join("\n");

      return new Response(vcfFile, {
        headers: {
          "Content-Type": "text/vcard; charset=utf-8",
          "Content-Disposition": 'attachment; filename="repository.vcf"'
        }
      });

    } catch (err) {
      return new Response("Error: " + err.message, { status: 500 });
    }
  }
};
