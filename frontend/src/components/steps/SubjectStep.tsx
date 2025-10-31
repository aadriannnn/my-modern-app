import React, { useState, useEffect } from "react";
import Tree, { DataNode, EventDataNode } from "rc-tree";
import "rc-tree/assets/index.css";

interface SubjectStepProps {
  menuData: Record<string, string[]>;
  selectedMenuKeys: React.Key[];
  setSelectedMenuKeys: (keys: React.Key[]) => void;
  onSearch: () => void;
}

const SubjectStep: React.FC<SubjectStepProps> = ({
  menuData,
  selectedMenuKeys,
  setSelectedMenuKeys,
  onSearch,
}) => {
  const [treeData, setTreeData] = useState<DataNode[]>([]);
  const [expandedKeys, setExpandedKeys] = useState<React.Key[]>([]);
  const [searchValue, setSearchValue] = useState("");
  const [autoExpandParent, setAutoExpandParent] = useState(true);

  useEffect(() => {
    const data: DataNode[] = Object.keys(menuData).map((materie) => ({
      title: materie,
      key: `materie:${materie}`,
      children: menuData[materie].map((obiect) => ({
        title: obiect,
        key: `obiect:${materie}:${obiect}`,
      })),
    }));
    setTreeData(data);
  }, [menuData]);

  const onExpand = (keys: React.Key[]) => {
    setExpandedKeys(keys);
    setAutoExpandParent(false);
  };

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { value } = e.target;
    const newExpandedKeys = treeData
      .map((item) => {
        if (
          typeof item.title === "string" &&
          item.title.toLowerCase().includes(value.toLowerCase())
        ) {
          return item.key;
        }
        if (item.children) {
          const matchingChild = item.children.find(
            (child) =>
              typeof child.title === "string" &&
              child.title.toLowerCase().includes(value.toLowerCase())
          );
          if (matchingChild) return item.key;
        }
        return null;
      })
      .filter((item, i, self): item is React.Key => !!item && self.indexOf(item) === i);

    setExpandedKeys(newExpandedKeys);
    setSearchValue(value);
    setAutoExpandParent(true);
  };

  return (
    <div className="p-4 bg-white rounded-lg shadow-md w-full max-w-2xl mx-auto">
      <div>
        <h3 className="font-semibold text-xl mb-3 text-gray-700">
          Meniu Materie și Obiect
        </h3>
        <input
          type="search"
          placeholder="Caută în meniu..."
          onChange={handleSearch}
          className="w-full p-2 border rounded-lg mb-2 text-base"
        />

        <div className="h-64 overflow-auto border rounded-lg p-2">
          <Tree
            checkable
            onCheck={(keys) => setSelectedMenuKeys(keys as React.Key[])}
            checkedKeys={selectedMenuKeys}
            onExpand={onExpand}
            expandedKeys={expandedKeys}
            autoExpandParent={autoExpandParent}
            treeData={treeData}
            // ✅ fix critical TS error: must return boolean, not string | boolean
            filterTreeNode={(node: EventDataNode) => {
              if (typeof node.title !== "string" || !searchValue) return false;
              return node.title.toLowerCase().includes(searchValue.toLowerCase());
            }}
          />
        </div>
      </div>

      <div className="mt-6">
        <button
          className="w-full px-4 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition text-lg"
          onClick={onSearch}
        >
          Caută spețe similare
        </button>
      </div>
    </div>
  );
};

export default SubjectStep;
