import type { ReactNode } from "react";

/** 解説本文はアプリに同梱。外部通信は出典リンクを開いたときだけ。 */
export function CompressionGuide({ onRead }: { onRead?: () => void }) {
  return (
    <details
      className="instrument compression-guide"
      onClickCapture={() => onRead?.()}
    >
      <summary>通信士の豆知識</summary>
      <p className="small muted">
        RLEの仕組み・学ぶ理由・圧縮の歴史を、気になるところから読めます。
      </p>
      <h3>RLE：ランレングス符号化</h3>
      <p>
        Run Length
        Encodingの略。同じ値が連続する区間を「ラン」、その長さを「ランレングス」と呼びます。RLEは、その連続を「個数」と「値」で表す考え方です。
      </p>
      <p>
        このゲームでは、個数1 B＋値1 Bで1組2
        B。地球では「その値を、その個数だけ出す」と読んで元に戻します。
      </p>
      <div className="guide-example">
        <code>AAAAAA → (6, A) → AAAAAA</code>
        <span>元6 B → 送る本体2 B → 復元6 B</span>
      </div>
      <p className="small muted">
        括弧やカンマは説明用で、送信しません。「1組2
        B」はこのゲームの形式です。RLEには異なる記録形式もあります。
      </p>

      <details className="guide-article">
        <summary>なぜ最初にRLEを学ぶの？</summary>
        <p>
          このゲームでは、「数える → 小さく表す →
          元に戻す」を自分の手で確かめやすいので、RLEから始めます。
        </p>
        <ol>
          <li>
            <strong>規則が目で見える。</strong>{" "}
            同じ文字の連続を見つけ、数えるところから始められます。
          </li>
          <li>
            <strong>復元まで追える。</strong>{" "}
            情報を捨てず、表し方を変える「可逆圧縮」を体験できます。
          </li>
          <li>
            <strong>得意・不得意を比べられる。</strong>{" "}
            連続がないデータでは、個数を付ける分だけ大きくなります。
          </li>
        </ol>
        <div className="guide-example">
          <code>ABCDEF → (1, A) (1, B) … (1, F)</code>
          <span>このゲームのRLEでは6 B → 12 B。無圧縮なら6 B。</span>
        </div>
        <p>
          任務2の目的は、容量以内で元どおりに届けること。無圧縮を選ぶのも、データに合った正しい判断です。
        </p>
        <p className="small muted">
          これは本ゲームの学習順です。技術が発明された順番を表しているわけではありません。
        </p>
      </details>

      <details className="guide-article">
        <summary>RLEはどんな位置づけの技術？</summary>
        <p>
          RLEは「同じ値の連続」に注目する、基本的な圧縮の考え方です。圧縮の工夫には、ほかにも次のようなものがあります。
        </p>
        <dl className="guide-methods">
          <div>
            <dt>RLE：連続を数える</dt>
            <dd>
              <code>AAAAAA</code>を「Aが6個」と表す。
            </dd>
          </div>
          <div>
            <dt>ハフマン符号化：よく出るものを短く</dt>
            <dd>出現頻度に応じて、記号を表す0と1の列の長さを変える。</dd>
          </div>
          <div>
            <dt>LZ77：前に出た並びを参照する</dt>
            <dd>
              <code>ABCABC</code>の後半を、前に出た<code>ABC</code>
              の位置と長さで表す。
            </dd>
          </div>
        </dl>
        <p>
          それぞれ注目する規則が違い、組み合わせて使うこともできます。DEFLATEはLZ77とハフマン符号化を組み合わせる方式です。
          <Source href="https://www.rfc-editor.org/rfc/rfc1951.html#section-2">
            RFC 1951 §2
          </Source>
        </p>
        <h4>実際の画像形式にも使われる考え方</h4>
        <p>
          1992年のTIFF
          6.0仕様には、ランレングス方式のPackBitsが記載されています。連続する部分と、そのままコピーする部分を分けて扱うため、このゲームの固定2
          Bの組とは形式が異なります。
          <Source href="https://www.itu.int/itudoc/itu-t/com16/tiff-fx/docs/tiff6.pdf#page=42">
            TIFF 6.0 §9（英語PDF）
          </Source>
        </p>
        <p className="small muted">
          ここでの1992年は仕様書の発行年です。RLEの発明年を示すものではありません。
        </p>
      </details>

      <details className="guide-article">
        <summary>圧縮技術の歴史をたどる</summary>
        <p>
          より少ないデータで情報を伝えるために、さまざまな工夫が研究されてきました。ここでは、元に戻せる「可逆圧縮」に関係する出来事を抜粋します。
        </p>
        <ol className="compression-timeline">
          <li>
            <span className="timeline-year">1948年 / 理論</span>
            <h4>シャノン：情報を量として考える</h4>
            <p>
              通信と情報を数学で扱い、情報源をどこまで短く表せるかを考える土台を示しました。
            </p>
            <Source href="https://www.princeton.edu/~wbialek/rome/refs/shannon_48.pdf">
              Shannonの原論文（英語PDF）
            </Source>
          </li>
          <li>
            <span className="timeline-year">1952年 / 論文</span>
            <h4>ハフマン：出現頻度を利用する</h4>
            <p>
              よく出る記号には短い符号を割り当て、平均の符号長を小さくする方法を発表しました。
            </p>
            <Source href="https://www.cse.iitd.ac.in/~pkalra/siv864/huffman_1952.pdf">
              Huffmanの原論文（英語PDF）
            </Source>
          </li>
          <li>
            <span className="timeline-year">1977年 / 論文</span>
            <h4>ZivとLempel：過去の並びを利用する</h4>
            <p>
              LZ77につながる方式を発表。すでに出た並びを、位置と長さで参照して表します。同じ文字の連続以外にも目を向ける考え方です。
            </p>
            <Source href="https://pzs.dstu.dp.ua/ComputerGraphics/ic/bibl/ziv_lempel_1977.pdf">
              Ziv・Lempelの原論文（英語PDF）
            </Source>
          </li>
          <li>
            <span className="timeline-year">1992年 / 仕様書の記録</span>
            <h4>TIFF 6.0：RLEの実用例</h4>
            <p>
              画像形式TIFFの仕様書に、ランレングス方式のPackBitsを記載。RLEの考え方が実際の画像データで使われる例です。
            </p>
            <Source href="https://www.itu.int/itudoc/itu-t/com16/tiff-fx/docs/tiff6.pdf#page=42">
              TIFF 6.0 §9（英語PDF）
            </Source>
          </li>
          <li>
            <span className="timeline-year">1996年 / 仕様書の公開</span>
            <h4>DEFLATE：工夫を組み合わせる</h4>
            <p>
              LZ77とハフマン符号化を組み合わせるDEFLATEの形式を、RFC
              1951として公開。1996年はこの文書の公開年で、方式の発明年ではありません。
            </p>
            <Source href="https://www.rfc-editor.org/rfc/rfc1951.html">
              RFC 1951（英語）
            </Source>
          </li>
        </ol>
        <p>
          RLE → ハフマン →
          LZ77という一本道の進化ではありません。何が繰り返されるか、何がよく出るかを見つけ、データに合う工夫を選んだり組み合わせたりします。
        </p>
      </details>
      <p className="small muted">
        今回の「復元」は元のバイト列へ戻すこと。ZIPからファイルを取り出す「展開」とは区別して学びます。別の方式や実ファイルの操作は今後の学習範囲です。
      </p>
      <p className="small muted">
        解説はこの画面で読めます。出典リンクは別タブで開きます。
      </p>
    </details>
  );
}

function Source({ href, children }: { href: string; children: ReactNode }) {
  return (
    <a
      className="guide-source"
      href={href}
      target="_blank"
      rel="noopener noreferrer"
    >
      出典：{children}
      <span>（別タブ）</span>
    </a>
  );
}
