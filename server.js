const express = require("express");
const cron = require("node-cron");
const axios = require("axios");

const app = express();

app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "GET, POST, DELETE, OPTIONS");
  res.header("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.sendStatus(200);
  next();
});

app.use(express.json());

const NEWS_API_KEY = "1fd8062954464eebb413b92f1c244a51";
let keywords = ["AI", "비트코인", "기후변화"];
let articles = [];

async function fetchNews() {
  console.log("뉴스 가져오는 중...");
  const allArticles = [];
  for (const kw of keywords) {
    try {
      const res = await axios.get(
        `https://newsapi.org/v2/everything?q=${encodeURIComponent(kw)}&language=ko&sortBy=publishedAt&pageSize=5&apiKey=${NEWS_API_KEY}`
      );
      if (res.data.articles) {
        const mapped = res.data.articles.map((a, i) => ({
          id: `${kw}-${i}-${Date.now()}`,
          keyword: kw,
          title: a.title,
          source: a.source?.name || "알 수 없음",
          time: new Date(a.publishedAt).toLocaleString("ko-KR"),
          url: a.url,
          summary: a.description || "내용 없음",
        }));
        allArticles.push(...mapped);
      }
    } catch (e) {
      console.error(`${kw} 뉴스 가져오기 실패:`, e.message);
    }
  }
  articles = allArticles.sort((a, b) => new Date(b.time) - new Date(a.time));
  console.log(`총 ${articles.length}개 기사 수집 완료`);
}

cron.schedule("*/30 * * * *", fetchNews);
fetchNews();

app.get("/articles", (req, res) => {
  const { keyword } = req.query;
  if (keyword && keyword !== "전체") {
    res.json(articles.filter(a => a.keyword === keyword));
  } else {
    res.json(articles);
  }
});

app.get("/keywords", (req, res) => {
  res.json(keywords);
});

app.post("/keywords", (req, res) => {
  const { keyword } = req.body;
  if (keyword && !keywords.includes(keyword)) {
    keywords.push(keyword);
    fetchNews();
  }
  res.json(keywords);
});

app.delete("/keywords/:keyword", (req, res) => {
  keywords = keywords.filter(k => k !== req.params.keyword);
  res.json(keywords);
});

app.get("/", (req, res) => {
  res.json({ status: "ok", message: "NewsAlert 서버 실행 중!" });
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`서버 실행 중: http://localhost:${PORT}`);
});