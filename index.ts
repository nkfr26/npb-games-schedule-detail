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

        const [match, info] = Array.from(row.querySelectorAll("td"));
        if (!match || !info) return;
        if (match.textContent === "\u00A0") return;

        const [home, visitor] = [
          match.querySelector(".team1")?.textContent,
          match.querySelector(".team2")?.textContent,
        ];
        if (!home || !visitor) return;

        const [place, time] = [
          info.querySelector(".place")?.textContent.replace(/\s+/g, ""),
          info.querySelector(".time")?.textContent,
        ];
        if (!place || !time) return;

        return {
          date,
          match: { home, visitor },
          info: { place, time },
        };
      });
    });

    const formatted = games
      .filter((game) => game !== undefined)
      .map((game) => ({
        ...game,
        date: formatDate(year, game.date),
      }));

    writeFileSync(
      `docs/schedule_${month}_detail.json`,
      JSON.stringify(formatted, null, 2)
    );
    await page.close();
  });

  await Promise.all(promises);
  await browser.close();
})();

const formatDate = (year: number, dateString: string) => {
  const dateMatch = dateString.match(/(\d+)\/(\d+)/);
  if (!dateMatch) return "";

  const [month, day] = [
    dateMatch[1]?.padStart(2, "0"),
    dateMatch[2]?.padStart(2, "0"),
  ];
  if (!month || !day) return "";

  return `${year}-${month}-${day}`;
};
