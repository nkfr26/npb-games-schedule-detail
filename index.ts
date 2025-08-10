import { chromium } from "@playwright/test";
import { writeFileSync, mkdirSync } from "fs";
import { join } from "path";

(async () => {
  // docsディレクトリを作成（存在しない場合）
  mkdirSync("docs", { recursive: true });

  const browser = await chromium.launch({ headless: true });

  const year = new Date().getFullYear();
  const months = ["03", "04", "05", "06", "07", "08", "09", "10", "11"];

  const promises = months.map(async (month) => {
    const page = await browser.newPage();

    try {
      await page.goto(
        `https://npb.jp/games/${year}/schedule_${month}_detail.html`,
        { waitUntil: "networkidle" } // ページの読み込みを確実に待つ
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

      const filePath = join("docs", `schedule_${month}_detail.json`);
      const filteredGames = games.filter((game) => game !== undefined);

      console.log(`Writing ${filteredGames.length} games to ${filePath}`);
      writeFileSync(filePath, JSON.stringify(filteredGames, null, 2));
    } catch (error) {
      console.error(`Error processing month ${month}:`, error);
    } finally {
      await page.close();
    }
  });

  await Promise.all(promises);
  await browser.close();

  console.log("Scraping completed");
})();
