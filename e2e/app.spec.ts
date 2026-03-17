import { test, expect } from "@playwright/test";
import { mockTauri, fillInput } from "./helpers";

test.beforeEach(async ({ page }) => {
  await mockTauri(page);
});

// ─── 任务列表页 ───

test.describe("任务列表页", () => {
  test("空状态显示提示文案", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByText("暂无跟读任务")).toBeVisible();
    await expect(page.getByText("还没有任务，开始创建吧")).toBeVisible();
  });

  test("点击创建任务跳转到创建页", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "创建任务" }).first().click();
    await expect(page).toHaveURL(/\/create/);
    await expect(page.getByText("创建跟读任务")).toBeVisible();
  });
});

// ─── 任务创建页 ───

test.describe("任务创建页", () => {
  test("返回按钮跳转回列表", async ({ page }) => {
    await page.goto("/create");
    await page.getByRole("button", { name: "返回列表" }).click();
    await expect(page).toHaveURL("/");
  });

  test("空文本提交显示错误提示", async ({ page }) => {
    await page.goto("/create");
    await page.getByRole("button", { name: "创建任务" }).last().click();
    // 前端校验 "请输入跟读文本" 或 mock 返回 "文本不能为空"
    await expect(page.getByText(/请输入跟读文本|文本不能为空/)).toBeVisible();
  });

  test("成功创建任务跳转到详情页", async ({ page }) => {
    await page.goto("/create");
    await fillInput(page, 'input[type="text"]', "我的测试任务");
    await fillInput(page, "textarea", "第一句话\n第二句话\n第三句话");
    await page.getByRole("button", { name: "创建任务" }).last().click();
    await expect(page).toHaveURL(/\/task\/test-task-/);
    await expect(page.getByText("我的测试任务")).toBeVisible();
  });

  test("语种选择切换正常", async ({ page }) => {
    await page.goto("/create");
    const jpBtn = page.getByRole("button", { name: "日本語" });
    await jpBtn.click();
    // 日语按钮应有选中样式（bg-primary-600）
    await expect(jpBtn).toHaveCSS("background-color", "rgb(79, 70, 229)");
  });

  test("行数计数器显示正确", async ({ page }) => {
    await page.goto("/create");
    await fillInput(page, "textarea", "行1\n行2\n\n行3");
    await expect(page.getByText("3 句")).toBeVisible();
  });
});

// ─── 任务详情页 ───

test.describe("任务详情页", () => {
  async function createTestTask(page: import("@playwright/test").Page) {
    await page.goto("/create");
    await fillInput(page, 'input[type="text"]', "详情测试");
    await fillInput(page, "textarea", "你好世界\n今天天气好\n我喜欢编程");
    await page.getByRole("button", { name: "创建任务" }).last().click();
    await expect(page).toHaveURL(/\/task\//);
  }

  test("显示任务标题和进度", async ({ page }) => {
    await createTestTask(page);
    await expect(page.getByText("详情测试")).toBeVisible();
    await expect(page.getByText("0/3 句完成")).toBeVisible();
    await expect(page.getByText("0%")).toBeVisible();
  });

  test("显示所有句子", async ({ page }) => {
    await createTestTask(page);
    await expect(page.getByText("你好世界")).toBeVisible();
    await expect(page.getByText("今天天气好")).toBeVisible();
    await expect(page.getByText("我喜欢编程")).toBeVisible();
  });

  test("返回列表按钮", async ({ page }) => {
    await createTestTask(page);
    await page.getByRole("button", { name: "返回列表" }).click();
    await expect(page).toHaveURL("/");
    // 列表页应该显示刚创建的任务
    await expect(page.getByText("详情测试")).toBeVisible();
  });

  test("查看结果按钮存在", async ({ page }) => {
    await createTestTask(page);
    await expect(page.getByRole("button", { name: "查看结果" })).toBeVisible();
  });
});

// ─── 任务列表 CRUD ───

test.describe("任务列表 CRUD", () => {
  test("创建后列表显示任务卡片", async ({ page }) => {
    await page.goto("/create");
    await fillInput(page, 'input[type="text"]', "CRUD测试");
    await fillInput(page, "textarea", "句子一\n句子二");
    await page.getByRole("button", { name: "English" }).click();
    await page.getByRole("button", { name: "创建任务" }).last().click();
    await expect(page).toHaveURL(/\/task\//);

    // 回到列表
    await page.getByRole("button", { name: "返回列表" }).click();
    await expect(page.getByText("CRUD测试")).toBeVisible();
    await expect(page.getByText("English")).toBeVisible();
    await expect(page.getByText("0/2")).toBeVisible();
  });

  test("删除任务需二次确认", async ({ page }) => {
    // 先创建
    await page.goto("/create");
    await fillInput(page, "textarea", "要删除的句子");
    await page.getByRole("button", { name: "创建任务" }).last().click();
    await page.getByRole("button", { name: "返回列表" }).click();
    await expect(page.getByText("要删除的句子")).toBeVisible();

    // 删除按钮通过 group-hover:opacity 显示，需要用 force click
    const card = page.locator("div").filter({ hasText: /^要删除的句子/ }).first();
    // 找到 svg trash 按钮 (最后一个 button in card area)
    const trashBtn = page.locator('button[title="删除"]');
    await trashBtn.click({ force: true });
    await expect(page.getByText("确认删除此任务")).toBeVisible();

    // 点取消
    await page.getByText("取消").click();
    await expect(page.getByText("确认删除此任务")).not.toBeVisible();
  });
});

// ─── 结果总览页 ───

test.describe("结果总览页", () => {
  test("从详情页进入结果页", async ({ page }) => {
    await page.goto("/create");
    await fillInput(page, 'input[type="text"]', "结果测试");
    await fillInput(page, "textarea", "测试句子");
    await page.getByRole("button", { name: "创建任务" }).last().click();

    await page.getByRole("button", { name: "查看结果" }).click();
    await expect(page).toHaveURL(/\/results/);
    await expect(page.getByText("结果总览")).toBeVisible();
    await expect(page.getByText("测试句子")).toBeVisible();
  });

  test("结果页显示原文列", async ({ page }) => {
    await page.goto("/create");
    await fillInput(page, "textarea", "第一行\n第二行");
    await page.getByRole("button", { name: "创建任务" }).last().click();
    await page.getByRole("button", { name: "查看结果" }).click();

    await expect(page.getByText("原文")).toBeVisible();
    await expect(page.getByText("第一行")).toBeVisible();
    await expect(page.getByText("第二行")).toBeVisible();
  });

  test("结果页返回练习按钮", async ({ page }) => {
    await page.goto("/create");
    await fillInput(page, "textarea", "句子");
    await page.getByRole("button", { name: "创建任务" }).last().click();
    await page.getByRole("button", { name: "查看结果" }).click();

    // 点返回练习
    await page.getByRole("button", { name: "返回练习" }).click();
    await expect(page).toHaveURL(/\/task\/test-task-/);
    await expect(page).not.toHaveURL(/\/results/);
  });
});

// ─── 侧边栏导航 ───

test.describe("侧边栏导航", () => {
  test("侧边栏显示 logo 和导航", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByText("跟读助手")).toBeVisible();
    await expect(page.getByText("SenseVoice ASR")).toBeVisible();
    await expect(page.getByRole("button", { name: "任务列表" })).toBeVisible();
    await expect(
      page.getByRole("navigation").getByRole("button", { name: "创建任务" })
    ).toBeVisible();
  });

  test("侧边栏导航切换页面", async ({ page }) => {
    await page.goto("/");
    await page
      .getByRole("complementary")
      .getByRole("button", { name: "创建任务" })
      .click();
    await expect(page).toHaveURL(/\/create/);

    await page.getByRole("button", { name: "任务列表" }).click();
    await expect(page).toHaveURL("/");
  });
});
