/**
 * @module Main
 * @description 应用入口文件，负责将 React 根组件挂载到 DOM 节点
 * @author RETALK Team
 * @date 2026-04
 */

import React from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import './styles/globals.css'

// 找到 HTML 里 id 为 "root" 的 div，把整个 React 应用塞进去
const root = createRoot(document.getElementById('root')!)

// StrictMode 是 React 的"严格检查模式"，开发时会帮你发现潜在问题，上线后不影响性能
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
