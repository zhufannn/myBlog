<!--
  个人简历详情页 —— 数据来自 src/data/resume.ts（由简历 PDF 整理）。
-->
<template>
  <article class="resume-page stack-subpage--wide surface-card surface-card--block" aria-labelledby="resume-title">
    <header class="resume-page__hero">
      <a class="resume-page__back text-link-soft meta-quiet" href="#" @click.prevent="$emit('back')">
        ← 返回首页
      </a>
      <p class="eyebrow">Resume · 个人简历</p>
      <h1 id="resume-title" class="text-shimmer resume-page__title">{{ basics.name }}</h1>
      <p class="resume-page__subtitle meta-quiet">{{ basics.gender }} · {{ basics.age }} 岁 · {{ job.city }}</p>

      <div class="resume-page__contact surface-card surface-card--inset">
        <div class="resume-contact-row">
          <span class="meta-quiet">邮箱</span>
          <a class="tile-value text-link-soft" :href="'mailto:' + basics.email">{{ basics.email }}</a>
        </div>
        <div class="resume-contact-row">
          <span class="meta-quiet">微信</span>
          <span class="tile-value">{{ basics.wechat }}</span>
        </div>
      </div>
    </header>

    <section class="resume-section" aria-labelledby="resume-intent">
      <h2 id="resume-intent" class="resume-h2 text-shimmer">求职概览</h2>
      <hr class="section-rule" aria-hidden="true" />
      <ul class="resume-kv">
        <li><span class="meta-quiet">工作年限</span> {{ job.experience }}</li>
        <li><span class="meta-quiet">意向岗位</span> {{ job.position }}</li>
        <li><span class="meta-quiet">期望薪资</span> {{ job.salary }}</li>
        <li><span class="meta-quiet">期望城市</span> {{ job.city }}</li>
      </ul>
    </section>

    <section class="resume-section" aria-labelledby="resume-skills">
      <h2 id="resume-skills" class="resume-h2 text-shimmer">擅长技术 · 个人优势</h2>
      <hr class="section-rule" aria-hidden="true" />
      <ol class="resume-list resume-list--numbered">
        <li v-for="(item, idx) in strengths" :key="idx" class="lede-secondary">{{ item }}</li>
      </ol>
    </section>

    <section class="resume-section" aria-labelledby="resume-work">
      <h2 id="resume-work" class="resume-h2 text-shimmer">工作经历</h2>
      <hr class="section-rule" aria-hidden="true" />
      <div v-for="(w, wi) in workHistory" :key="wi" class="resume-card surface-card surface-card--inset">
        <div class="resume-card__head">
          <h3 class="resume-h3">{{ w.company }}</h3>
          <p class="resume-card__meta meta-quiet">{{ w.role }} · {{ w.period }}</p>
        </div>
        <p class="resume-card__label eyebrow">工作内容</p>
        <ul class="resume-list">
          <li v-for="(line, li) in w.summary" :key="'s-' + li" class="lede-secondary">{{ line }}</li>
        </ul>
        <template v-if="w.highlights.length">
          <p class="resume-card__label eyebrow">业绩亮点</p>
          <ul class="resume-list">
            <li v-for="(line, hi) in w.highlights" :key="'h-' + hi" class="lede-secondary">{{ line }}</li>
          </ul>
        </template>
      </div>
    </section>

    <section class="resume-section" aria-labelledby="resume-projects">
      <h2 id="resume-projects" class="resume-h2 text-shimmer">项目经历</h2>
      <hr class="section-rule" aria-hidden="true" />
      <div v-for="(p, pi) in projects" :key="pi" class="resume-card surface-card surface-card--inset">
        <div class="resume-card__head">
          <h3 class="resume-h3">{{ p.name }}</h3>
          <p class="resume-card__meta meta-quiet">{{ p.role }} · {{ p.period }}</p>
        </div>
        <ul v-if="p.intro?.length" class="resume-list">
          <li v-for="(line, ii) in p.intro" :key="'i-' + ii" class="lede-secondary">{{ line }}</li>
        </ul>
        <template v-if="p.stack?.length">
          <p class="resume-card__label eyebrow">技术栈</p>
          <ul class="resume-tags">
            <li v-for="t in p.stack" :key="t" class="resume-tag">{{ t }}</li>
          </ul>
        </template>
        <template v-if="p.duties?.length">
          <p class="resume-card__label eyebrow">职责与模块</p>
          <ul class="resume-list">
            <li v-for="(line, di) in p.duties" :key="'d-' + di" class="lede-secondary">{{ line }}</li>
          </ul>
        </template>
        <template v-if="p.results?.length">
          <p class="resume-card__label eyebrow">业绩 / 成果</p>
          <ul class="resume-list">
            <li v-for="(line, ri) in p.results" :key="'r-' + ri" class="lede-secondary">{{ line }}</li>
          </ul>
        </template>
      </div>
    </section>

    <section class="resume-section" aria-labelledby="resume-edu">
      <h2 id="resume-edu" class="resume-h2 text-shimmer">教育经历</h2>
      <hr class="section-rule" aria-hidden="true" />
      <div class="resume-edu surface-card surface-card--inset">
        <strong class="tile-value">{{ education.school }}</strong>
        <p class="lede-secondary resume-edu__line">
          {{ education.degree }} · {{ education.major }} · {{ education.period }}
        </p>
      </div>
    </section>
  </article>
</template>

<script setup lang="ts">
import {
  resumeBasics as basics,
  resumeEducation as education,
  resumeJobIntent as job,
  resumeProjects as projects,
  resumeStrengths as strengths,
  resumeWorkHistory as workHistory,
} from '../data/resume'

defineEmits<{
  (e: 'back'): void
}>()
</script>
