"""
Export Service -- 引用导出服务
@description 将引用信息格式化导出为学术引用格式。
             支持 BibTeX 和 GB/T 7714-2015 两种标准格式。
             BibTeX 用于 LaTeX 论文排版，GB/T 7714 是中文学术论文的国家标准引用格式。
@author 施乔
"""
from typing import List, Dict, Any


# ---------------------------------------------------------------------------
# BibTeX 格式导出
# ---------------------------------------------------------------------------

def format_bibtex(citations: List[Dict[str, Any]]) -> str:
    """将引用列表格式化为 BibTeX 条目字符串。

    BibTeX 是 LaTeX 生态中最常用的文献引用格式。每条引用生成一个
    @article 条目，citation key 由标题前三个英文单词拼接而成。

    Args:
        citations: 引用信息列表，每项应包含 document_title、year、page 等字段

    Returns:
        多条 BibTeX 条目拼接的字符串，条目间用空行分隔
    """
    entries = []

    for i, cit in enumerate(citations):
        title = cit.get("document_title", "Unknown")

        # 生成 citation key：取标题前 3 个纯字母单词，转小写拼接，再加序号
        # 从标题里挑最多 3 个英文单词拼成一个简短的引用代号，
        #         比如标题 "Deep Learning Methods" 会变成 "deeplearningmethods0"
        key_words = title.split(" ")[:3]
        key = "".join(word.lower() for word in key_words if word.isalpha())
        if not key:
            # 标题中没有英文单词时，使用 "doc" + 序号作为 fallback
            key = f"doc{i}"

        year = cit.get("year", 2024)
        page = cit.get("page", "")

        # 按 BibTeX @article 标准格式拼接条目
        entry = f"""@article{{{key}{i},
  title = {{{title}}},
  year = {{{year}}},
  page = {{{page}}},
}}"""
        entries.append(entry)

    return "\n\n".join(entries)


# ---------------------------------------------------------------------------
# GB/T 7714-2015 格式导出
# ---------------------------------------------------------------------------

def format_gb7714(citations: List[Dict[str, Any]]) -> str:
    """将引用列表格式化为 GB/T 7714-2015 标准引用字符串。

    GB/T 7714-2015 是中国国家标准《信息与文献 参考文献著录规则》，
    格式为：[序号] 作者. 标题 [文献类型]. 年份：页码.
    当前实现中因缺少作者信息，使用"未知作者"作为占位。

    Args:
        citations: 引用信息列表，每项应包含 document_title、page 等字段

    Returns:
        多条 GB/T 7714 引用拼接的字符串，每条占一行
    """
    entries = []

    # 按照国标格式，给每条引用编号，拼成 "[1] 作者. 标题：页码." 的样子
    for i, cit in enumerate(citations, 1):
        title = cit.get("document_title", "无标题")
        page = cit.get("page", "")

        # 按 GB/T 7714 格式拼接：[序号] 作者. 标题：页码.
        # 注意：因数据中无作者字段，此处使用"未知作者"占位
        entry = f"[{i}] 未知作者。{title}"
        if page:
            entry += f"：{page}."
        else:
            entry += "."
        entries.append(entry)

    return "\n".join(entries)


# ---------------------------------------------------------------------------
# 导出主入口
# ---------------------------------------------------------------------------

def export_citations(citations: List[Dict[str, Any]], format: str) -> str:
    """根据指定格式导出引用文本。

    作为导出功能的统一入口，根据 format 参数分发到具体的格式化函数。

    Args:
        citations: 引用信息列表
        format:    目标格式，支持 "bibtex"、"gb7714"、"gbt7714"（不区分大小写）

    Returns:
        格式化后的引用文本字符串

    Raises:
        ValueError: 不支持的导出格式
    """
    # 看用户要哪种格式，就调用对应的格式化函数
    if format.lower() == "bibtex":
        return format_bibtex(citations)
    elif format.lower() in ["gb7714", "gbt7714"]:
        return format_gb7714(citations)
    else:
        raise ValueError(f"Unsupported format: {format}")
