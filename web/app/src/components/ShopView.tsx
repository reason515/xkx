import { useState, useEffect } from "react";
import type { InvItem } from "../lib/types";
import {
  parseVendorGoods,
  parseDealerCategories,
} from "../lib/parser";
import type { VendorGood } from "../lib/parser";

interface ShopViewProps {
  npcName: string;
  npcId: string;
  askTarget: string;
  canTrade: boolean;
  canSell: boolean;
  inventory: InvItem[];
  docText: string;
  docLoading: boolean;
  onAction: (cmd: string) => void;
  onDocAction: (cmd: string) => void;
  onClearDoc: () => void;
}

type ShopTab = "buy" | "sell";

export function ShopView({
  canTrade,
  canSell,
  inventory,
  docText,
  docLoading,
  onAction,
  onDocAction,
  onClearDoc,
}: ShopViewProps) {
  const [tab, setTab] = useState<ShopTab>(canTrade ? "buy" : "sell");
  const [buyQty, setBuyQty] = useState(1);
  const [selectedGood, setSelectedGood] = useState<VendorGood | null>(null);
  const [listCategory, setListCategory] = useState<string>("");

  // Auto-list when entering buy tab
  useEffect(() => {
    if (tab === "buy" && canTrade) {
      onClearDoc();
      onDocAction(listCategory ? `list ${listCategory}` : "list");
    }
  }, [tab, canTrade, listCategory]);

  // Refresh list after purchase
  const handleBuy = (good: VendorGood) => {
    const cmd = buyQty > 1 ? `buy ${buyQty} ${good.id}` : good.command;
    onAction(cmd);
    setSelectedGood(null);
    setBuyQty(1);
    // Refresh list after short delay
    setTimeout(() => {
      onDocAction(listCategory ? `list ${listCategory}` : "list");
    }, 600);
  };

  const handleSell = (item: InvItem) => {
    onAction(`sell ${item.id}`);
    // Inventory refresh handled by useGame scheduleInvRefresh
  };

  const vendorGoods = tab === "buy" ? parseVendorGoods(docText) : [];
  const dealerCategories = tab === "buy" ? parseDealerCategories(docText) : [];

  // Items player can sell (not equipped, not embedded)
  const sellItems = inventory.filter(
    (item) => !item.equipped && !item.embedded
  );

  return (
    <div className="shop-view">
      {/* Tabs */}
      {canTrade && canSell ? (
        <div className="shop-tabs">
          <button
            type="button"
            className={`shop-tab ${tab === "buy" ? "active" : ""}`}
            onClick={() => setTab("buy")}
          >
            购买
          </button>
          <button
            type="button"
            className={`shop-tab ${tab === "sell" ? "active" : ""}`}
            onClick={() => setTab("sell")}
          >
            卖出
          </button>
        </div>
      ) : (
        <p className="shop-mode-label">
          {canTrade ? "购买" : "卖出"}
        </p>
      )}

      {/* Buy tab */}
      {tab === "buy" && (
        <div className="shop-buy">
          {docLoading && !docText ? (
            <p className="doc-status">正在查看货品…</p>
          ) : dealerCategories.length > 0 && vendorGoods.length === 0 ? (
            /* Category-based shops (pawn shops etc.) */
            <>
              <p className="entity-mode-hint">选择货品类别：</p>
              <div className="shop-categories">
                {dealerCategories.map((cat) => (
                  <button
                    key={cat.id}
                    type="button"
                    className={`shop-cat-chip ${listCategory === cat.id ? "active" : ""}`}
                    onClick={() => {
                      setListCategory(cat.id);
                      onDocAction(cat.command);
                    }}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>
              {listCategory && docLoading && vendorGoods.length === 0 ? (
                <p className="doc-status">正在查看…</p>
              ) : null}
            </>
          ) : vendorGoods.length > 0 ? (
            <>
              {listCategory && (
                <button
                  type="button"
                  className="doc-back"
                  onClick={() => {
                    setListCategory("");
                    onDocAction("list");
                  }}
                >
                  ← 全部类别
                </button>
              )}
              <div className="shop-goods-list">
                {vendorGoods.map((good) => (
                  <div key={good.id} className="shop-good-row">
                    <div className="shop-good-info">
                      <span className="shop-good-name">{good.name}</span>
                      <span className="shop-good-price">{good.price}</span>
                    </div>
                    {selectedGood?.id === good.id ? (
                      <div className="shop-good-qty">
                        <button
                          type="button"
                          className="shop-qty-btn"
                          onClick={() => setBuyQty(Math.max(1, buyQty - 1))}
                        >
                          −
                        </button>
                        <span className="shop-qty-num">{buyQty}</span>
                        <button
                          type="button"
                          className="shop-qty-btn"
                          onClick={() => setBuyQty(Math.min(99, buyQty + 1))}
                        >
                          +
                        </button>
                        <button
                          type="button"
                          className="shop-qty-confirm"
                          onClick={() => handleBuy(good)}
                        >
                          确认
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        className="shop-buy-btn"
                        onClick={() => {
                          if (buyQty > 1) {
                            setSelectedGood(good);
                          } else {
                            handleBuy(good);
                          }
                        }}
                        onContextMenu={(e) => {
                          e.preventDefault();
                          setSelectedGood(good);
                        }}
                      >
                        购买
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </>
          ) : docText ? (
            <pre className="doc-body">{docText}</pre>
          ) : null}
        </div>
      )}

      {/* Sell tab */}
      {tab === "sell" && (
        <div className="shop-sell">
          {sellItems.length > 0 ? (
            <div className="shop-goods-list">
              {sellItems.map((item) => (
                <div key={`${item.id}-${item.name}`} className="shop-good-row">
                  <div className="shop-good-info">
                    <span className="shop-good-name">{item.name}</span>
                    <span className="shop-good-price dim">行囊中</span>
                  </div>
                  <button
                    type="button"
                    className="shop-sell-btn"
                    onClick={() => handleSell(item)}
                  >
                    卖出
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <p className="doc-status">行囊里没有可卖出的物品。</p>
          )}
        </div>
      )}
    </div>
  );
}
