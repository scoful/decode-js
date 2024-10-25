const express = require("express");
const bodyParser = require("body-parser");
const axios = require("axios");
const PluginCommon = require("./plugin/common.js");
const PluginJjencode = require("./plugin/jjencode.js");
const PluginSojson = require("./plugin/sojson.js");
const PluginSojsonV7 = require("./plugin/sojsonv7.js");
const PluginObfuscator = require("./plugin/obfuscator.js");
const PluginAwsc = require("./plugin/awsc.js");

// 创建 Express 应用
const app = express();

// 使用 bodyParser 中间件解析 JSON 请求
app.use(bodyParser.json());

// 创建处理代码转换的 API
app.post("/parse_js", async (req, res) => {
  const { type = "common", url } = req.body;

  // 检查是否有传递 URL
  if (!url) {
    return res.status(400).json({ error: "Missing URL parameter." });
  }

  try {
    // 请求URL以获取HTML内容
    const response = await axios.get(url);
    const htmlContent = response.data;

    // 使用正则表达式提取 <script> 标签内的内容
    const scriptRegex = /<script\b[^>]*>([\s\S]*?)<\/script>/gi;
    let match;
    let targetScript = null;

    // 遍历所有的 <script> 标签内容
    while ((match = scriptRegex.exec(htmlContent)) !== null) {
      const scriptContent = match[1].trim();

      // 检查脚本内容中是否包含 "function"
      if (scriptContent.includes("function")) {
        targetScript = scriptContent;
        break;
      }
    }

    if (!targetScript) {
      return res.status(400).json({ error: "No <script> tag containing \"function\" found." });
    }

    // 净化源代码
    let processedCode;
    if (type === "sojson") {
      processedCode = PluginSojson(targetScript);
    } else if (type === "sojsonv7") {
      processedCode = PluginSojsonV7(targetScript);
    } else if (type === "obfuscator") {
      processedCode = PluginObfuscator(targetScript);
    } else if (type === "awsc") {
      processedCode = PluginAwsc(targetScript);
    } else if (type === "jjencode") {
      processedCode = PluginJjencode(targetScript);
    } else {
      processedCode = PluginCommon(targetScript);
    }
    if (processedCode == null) {
      processedCode = targetScript;
    }
    // 使用正则表达式提取函数 a 的参数
    const paramRegex = /a\(\s*["']([^"']+)["']\s*,\s*["']([^"']+)["']\s*,\s*["']([^"']+)["']\s*\)/;
    const paramMatch = paramRegex.exec(processedCode);

    if (paramMatch) {
      const params = {
        aid: paramMatch[1],
        sessionId: paramMatch[2],
        twoLevelDomain: paramMatch[3]
      };
      return res.json({ params });
    } else {
      return res.status(400).json({ error: "No matching function \"a\" with three parameters found." });
    }

  } catch (error) {
    console.error(`Error fetching the URL: ${error.message}`);
    return res.status(500).json({ error: "Failed to fetch the URL or process the content." });
  }
});

// 启动服务器
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
