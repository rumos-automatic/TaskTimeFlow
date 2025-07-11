import { Metadata } from "next"

export const metadata: Metadata = {
  title: "プライバシーポリシー | TaskTimeFlow",
  description: "TaskTimeFlowのプライバシーポリシーページです。個人情報の取り扱いについて説明しています。",
}

export default function PrivacyPolicyPage() {
  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <h1 className="text-3xl font-bold mb-8">プライバシーポリシー</h1>
      
      <div className="space-y-6 text-sm md:text-base">
        <section>
          <p className="mb-4">
            TaskTimeFlow（以下、「当サービス」といいます）は、ユーザーの個人情報の取扱いについて、以下のとおりプライバシーポリシー（以下、「本ポリシー」といいます）を定めます。
          </p>
          <p className="text-muted-foreground text-sm">最終更新日: 2025年1月11日</p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4">第1条（個人情報）</h2>
          <p>
            「個人情報」とは、個人情報保護法にいう「個人情報」を指すものとし、生存する個人に関する情報であって、当該情報に含まれる氏名、生年月日、住所、電話番号、連絡先その他の記述等により特定の個人を識別できる情報及び容貌、指紋、声紋にかかるデータ、及び健康保険証の保険者番号などの当該情報単体から特定の個人を識別できる情報（個人識別情報）を指します。
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4">第2条（個人情報の収集方法）</h2>
          <p className="mb-2">当サービスは、ユーザーが利用登録をする際に以下の情報を取得します：</p>
          <ul className="list-disc pl-6 space-y-1">
            <li>Googleアカウント情報（氏名、メールアドレス、プロフィール画像）</li>
            <li>Google Calendarのイベント情報</li>
            <li>Google Tasksのタスク情報</li>
            <li>当サービス内で作成・編集されたタスク、カテゴリ、時間ログなどの情報</li>
          </ul>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4">第3条（個人情報を収集・利用する目的）</h2>
          <p className="mb-2">当サービスが個人情報を収集・利用する目的は、以下のとおりです：</p>
          <ol className="list-decimal pl-6 space-y-1">
            <li>当サービスの提供・運営のため</li>
            <li>ユーザーからのお問い合わせに回答するため</li>
            <li>ユーザーが利用中のサービスの新機能、更新情報、キャンペーン等の案内のため</li>
            <li>メンテナンス、重要なお知らせなど必要に応じたご連絡のため</li>
            <li>利用規約に違反したユーザーや、不正・不当な目的でサービスを利用しようとするユーザーの特定をし、ご利用をお断りするため</li>
            <li>上記の利用目的に付随する目的</li>
          </ol>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4">第4条（広告について）</h2>
          <p className="mb-2">
            当サービスでは、Google AdSenseを利用して広告を配信しています。Google AdSenseは、ユーザーの興味に応じた広告を表示するためにCookieを使用することがあります。
          </p>
          <p className="mb-2">
            Cookieを無効にする方法やGoogleアドセンスに関する詳細は、
            <a href="https://policies.google.com/technologies/ads" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
              Google広告ポリシー
            </a>
            をご覧ください。
          </p>
          <p>
            なお、プレミアムプランをご利用のユーザー様には広告は表示されません。
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4">第5条（利用目的の変更）</h2>
          <ol className="list-decimal pl-6 space-y-1">
            <li>当サービスは、利用目的が変更前と関連性を有すると合理的に認められる場合に限り、個人情報の利用目的を変更するものとします。</li>
            <li>利用目的の変更を行った場合には、変更後の目的について、当サービス所定の方法により、ユーザーに通知し、または本ウェブサイト上に公表するものとします。</li>
          </ol>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4">第6条（個人情報の第三者提供）</h2>
          <p className="mb-2">当サービスは、次に掲げる場合を除いて、あらかじめユーザーの同意を得ることなく、第三者に個人情報を提供することはありません。</p>
          <ol className="list-decimal pl-6 space-y-1">
            <li>人の生命、身体または財産の保護のために必要がある場合であって、本人の同意を得ることが困難であるとき</li>
            <li>公衆衛生の向上または児童の健全な育成の推進のために特に必要がある場合であって、本人の同意を得ることが困難であるとき</li>
            <li>国の機関もしくは地方公共団体またはその委託を受けた者が法令の定める事務を遂行することに対して協力する必要がある場合であって、本人の同意を得ることにより当該事務の遂行に支障を及ぼすおそれがあるとき</li>
            <li>予め次の事項を告知あるいは公表し、かつ当サービスが個人情報保護委員会に届出をしたとき</li>
          </ol>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4">第7条（個人情報の開示）</h2>
          <p className="mb-2">
            当サービスは、本人から個人情報の開示を求められたときは、本人に対し、遅滞なくこれを開示します。ただし、開示することにより次のいずれかに該当する場合は、その全部または一部を開示しないこともあり、開示しない決定をした場合には、その旨を遅滞なく通知します。
          </p>
          <ol className="list-decimal pl-6 space-y-1">
            <li>本人または第三者の生命、身体、財産その他の権利利益を害するおそれがある場合</li>
            <li>当サービスの業務の適正な実施に著しい支障を及ぼすおそれがある場合</li>
            <li>その他法令に違反することとなる場合</li>
          </ol>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4">第8条（個人情報の訂正および削除）</h2>
          <ol className="list-decimal pl-6 space-y-1">
            <li>ユーザーは、当サービスの保有する自己の個人情報が誤った情報である場合には、当サービスが定める手続きにより、当サービスに対して個人情報の訂正、追加または削除（以下、「訂正等」といいます）を請求することができます。</li>
            <li>当サービスは、ユーザーから前項の請求を受けてその請求に応じる必要があると判断した場合には、遅滞なく、当該個人情報の訂正等を行うものとします。</li>
            <li>当サービスは、前項の規定に基づき訂正等を行った場合、または訂正等を行わない旨の決定をしたときは遅滞なく、これをユーザーに通知します。</li>
          </ol>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4">第9条（個人情報の利用停止等）</h2>
          <p>
            当サービスは、本人から、個人情報が、利用目的の範囲を超えて取り扱われているという理由、または不正の手段により取得されたものであるという理由により、その利用の停止または消去（以下、「利用停止等」といいます）を求められた場合には、遅滞なく必要な調査を行います。
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4">第10条（プライバシーポリシーの変更）</h2>
          <ol className="list-decimal pl-6 space-y-1">
            <li>本ポリシーの内容は、法令その他本ポリシーに別段の定めのある事項を除いて、ユーザーに通知することなく、変更することができるものとします。</li>
            <li>当サービスが別途定める場合を除いて、変更後のプライバシーポリシーは、本ウェブサイトに掲載したときから効力を生じるものとします。</li>
          </ol>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4">第11条（お問い合わせ窓口）</h2>
          <p>本ポリシーに関するお問い合わせは、サービス内のお問い合わせフォームよりお願いいたします。</p>
        </section>
      </div>
    </div>
  )
}