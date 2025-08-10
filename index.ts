import { chromium } from "@playwright/test";
import { mkdirSync, writeFileSync } from "fs";

(async () => {
  mkdirSync("docs", { recursive: true });

  const browser = await chromium.launch({ headless: true });

  const year = new Date().getFullYear();
  const months = ["03", "04", "05", "06", "07", "08", "09", "10", "11"];

  const promises = months.map(async (month) => {
    const page = await browser.newPage();
    await page.goto(
      `https://npb.jp/games/${year}/schedule_${month}_detail.html`
    );

    const games = await page.evaluate(() => {
      const rows = Array.from(
        document.querySelectorAll("#schedule_detail tbody tr")
      );

      let date: string;
      return rows.map((row) => {
        date = row.querySelector("th[rowspan]")?.textContent || date;

        const [match, info, comment, tdPits] = Array.from(
          row.querySelectorAll("td")
        );
        if (!match || !info || !comment || !tdPits) return;

        if (match.textContent === "\u00A0") return;

        const team1 = match.querySelector(".team1")?.textContent;
        const team2 = match.querySelector(".team2")?.textContent;
        if (!team1 || !team2) return;

        const place = info.querySelector(".place")?.textContent;
        const time = info.querySelector(".time")?.textContent;
        if (!place || !time) return;

        const pit = Array.from(tdPits.querySelectorAll(".pit"))
          .map((tdPit) => tdPit.textContent?.trim())
          .filter((tdPit) => tdPit !== undefined);

        return {
          date,
          match: { home: team1, visitor: team2 },
          info: { place: place.replace(/\s+/g, ""), time },
          comment: comment.querySelector(".comment")?.textContent || "",
          pit,
        };
      });
    });
    writeFileSync(
      `docs/schedule_${month}_detail.json`,
      JSON.stringify(games.filter((game) => game !== undefined))
    );
    await page.close();
  });

  await Promise.all(promises);
  await browser.close();
})();
