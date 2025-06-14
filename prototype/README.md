# TaskTimeFlow UI Prototype

TaskTimeFlowのUIデザインプロトタイプです。ガラスモーフィズムテーマを採用した美しいインターフェースで、かんばん、タイムライン、分析の3つの主要機能を確認できます。

## 📁 ファイル構成

```
prototype/
├── index.html          # メインHTMLファイル
├── assets/
│   ├── styles.css      # ガラスモーフィズムスタイル
│   └── script.js       # インタラクション機能
└── README.md           # このファイル
```

## 🚀 プロトタイプの起動方法

1. **index.html をブラウザで開く**
   ```bash
   # 方法1: ファイルを直接ブラウザで開く
   open prototype/index.html
   
   # 方法2: ローカルサーバーを使用（推奨）
   cd prototype
   python -m http.server 8000
   # http://localhost:8000 でアクセス
   ```

2. **推奨ブラウザ**: Chrome, Firefox, Safari, Edge（最新版）

## 🎨 デザイン特徴

### ガラスモーフィズムテーマ
- 半透明の背景とぼかし効果
- グラデーション背景とフローティングシェイプ
- ホバー時の微細なアニメーション
- 美しいカラーパレット（インディゴ、パープル、エメラルド）

### レスポンシブデザイン
- デスクトップ、タブレット、モバイル対応
- 画面サイズに応じた柔軟なレイアウト
- タッチデバイス対応のインタラクション

## 🧭 機能別ガイド

### 1. かんばんボード
**アクセス方法**: ヘッダーの「かんばん」タブをクリック

**機能**:
- 4つのステータス列（ToDo、進行中、レビュー、完了）
- タスクカードのホバーエフェクト
- +ボタンで新規タスク追加のデモ
- ドラッグ&ドロップの視覚的フィードバック

**操作方法**:
- タスクカードをクリックして選択
- +ボタンで新しいタスクを追加
- タスクカードをドラッグしてタイムラインに移動可能

### 2. タイムライン
**アクセス方法**: ヘッダーの「タイムライン」タブをクリック

**機能**:
- 1日の時間軸表示（8:00-17:00）
- 既存タスクの時間割り当て表示
- 空きスロットへのドラッグ&ドロップ対応
- 日/週/月ビューの切り替えボタン

**操作方法**:
- かんばんからタスクカードをドラッグして時間スロットにドロップ
- 空きスロットにホバーすると「ドラッグしてタスクを追加」のヒント表示

### 3. 分析レポート
**アクセス方法**: ヘッダーの「分析」タブをクリック

**機能**:
- サマリー統計カード（完了タスク数、作業時間、ポモドーロ、生産性スコア）
- インタラクティブなチャート表示
- 完了タスクの履歴一覧
- 期間選択とエクスポート機能

**特徴**:
- 数値のカウントアップアニメーション
- バーチャートの段階的表示
- ガラスモーフィズムカードデザイン

### 4. ポモドーロタイマー
**場所**: 画面右下に固定表示

**機能**:
- 25分タイマーの表示
- 再生/一時停止/停止/スキップボタン
- 円形プログレスバー
- 現在のタスクとセッション数表示

**操作方法**:
- ⏸️ボタン: タイマーの一時停止/再開
- ⏹️ボタン: タイマーのリセット
- ⏭️ボタン: セッションのスキップ

## ⌨️ キーボードショートカット

- **Ctrl + N**: 新規タスク追加
- **Ctrl + M**: かんばん⇔タイムライン切り替え
- **Escape**: 検索ボックスをクリア

## 🔍 インタラクティブ機能

### 検索機能
- ヘッダーの検索ボックスでタスクをフィルタリング
- タイトルと説明文を対象に検索
- リアルタイムフィルタリング

### フィルター機能
- サイドバーで優先度別フィルタリング
- チェックボックスによる複数選択
- 即座に結果を反映

### ドラッグ&ドロップシミュレーション
- タスクカードをドラッグすると半透明になり、わずかに傾く
- タイムラインの空きスロットがドロップゾーンとして光る
- ドロップ時に新しいタイムラインタスクが作成される

### 通知システム
- タスク追加時、ドロップ時に美しい通知が表示
- 右上からスライドインするアニメーション
- 3秒後に自動的に消える

## 🎯 確認ポイント

### デザイン面
- [ ] ガラスモーフィズムの透明感が美しく表現されているか
- [ ] ホバーエフェクトがスムーズに動作するか
- [ ] カラーパレットが統一されているか
- [ ] レスポンシブデザインが機能するか

### 機能面
- [ ] タブ切り替えがスムーズに動作するか
- [ ] ドラッグ&ドロップの視覚的フィードバックが適切か
- [ ] ポモドーロタイマーが正しく動作するか
- [ ] 検索とフィルター機能が期待通りに働くか

### UX面
- [ ] 直感的な操作が可能か
- [ ] 視覚的なフィードバックが十分か
- [ ] 画面間の遷移が自然か
- [ ] 情報の階層が明確か

## 🔄 今後の実装予定

このプロトタイプは静的なデモですが、実際の開発では以下が追加されます：

1. **バックエンド連携**
   - タスクのCRUD操作
   - リアルタイム同期
   - データ永続化

2. **Google API連携**
   - Googleカレンダーとの双方向同期
   - Google Tasksとの連携
   - OAuth認証

3. **高度な機能**
   - 本格的なドラッグ&ドロップライブラリ（@dnd-kit）
   - リアルタイムポモドーロタイマー
   - 詳細な分析とレポート機能

4. **最適化**
   - 仮想スクロール
   - 遅延ローディング
   - Service Worker対応

## 💡 フィードバック

プロトタイプをご確認いただき、以下の点についてフィードバックをお聞かせください：

- デザインの印象や改善提案
- 操作感やユーザビリティ
- 追加したい機能や変更したい点
- 技術的な懸念や質問

---

**プロジェクト**: TaskTimeFlow  
**作成日**: 2024年6月8日  
**バージョン**: Prototype v1.0