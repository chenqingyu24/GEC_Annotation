import { Fragment, type KeyboardEvent, type ReactNode } from "react";
import type {
  DiffView,
  EditGroup,
  EditGroupItem,
  EditGroupItemSegment,
  Target
} from "../types";

interface EditGroupTableProps {
  view: DiffView;
  selectedGroupId: string | null;
  onSelectGroup: (groupId: string) => void;
}

export function EditGroupTable({
  view,
  selectedGroupId,
  onSelectGroup
}: EditGroupTableProps) {
  return (
    <section className="panel result-panel" aria-labelledby="edit-group-title">
      <div className="panel-header">
        <h2 id="edit-group-title">编辑组表格</h2>
      </div>

      <div className="table-scroll">
        <table className="edit-table">
          <thead>
            <tr>
              <th scope="col">编辑组</th>
              <th scope="col">原句片段</th>
              {view.targets.map((target) => (
                <th scope="col" key={target.id}>
                  {targetLabel(target)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {view.edit_groups.map((group) => (
              <tr
                className={group.group_id === selectedGroupId ? "is-selected" : ""}
                key={group.group_id}
                tabIndex={0}
                onClick={() => onSelectGroup(group.group_id)}
                onKeyDown={(event) => handleRowKeyDown(event, group.group_id, onSelectGroup)}
              >
                <th scope="row">
                  <span className="group-id">{group.group_id}</span>
                  <span className="group-range">
                    {group.source_start === group.source_end
                      ? group.source_start
                      : `${group.source_start}-${group.source_end}`}
                  </span>
                </th>
                <td>{renderSourceCell(group)}</td>
                {view.targets.map((target) => (
                  <td key={target.id}>{renderItem(group.items[target.id])}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function handleRowKeyDown(
  event: KeyboardEvent<HTMLTableRowElement>,
  groupId: string,
  onSelectGroup: (groupId: string) => void
) {
  if (event.key !== "Enter" && event.key !== " ") {
    return;
  }

  event.preventDefault();
  onSelectGroup(groupId);
}

function renderSourceCell(group: EditGroup): ReactNode {
  if (group.source_text === "") {
    return <InsertMark text="" />;
  }

  return <span className="source-fragment">{group.source_text}</span>;
}

function renderItem(item: EditGroupItem | undefined): ReactNode {
  if (!item) {
    return <span className="muted-text">-</span>;
  }

  const segments =
    item.segments.length > 0 ? item.segments : [{ text: item.text, op: item.op }];

  return segments.map((segment, index) => (
    <Fragment key={`${segment.op}-${index}`}>{renderSegment(segment)}</Fragment>
  ));
}

function renderSegment(segment: EditGroupItemSegment): ReactNode {
  if (segment.op === "delete") {
    return <DeleteMark text={segment.text} />;
  }

  if (segment.op === "insert" || segment.op === "anchor") {
    return <InsertMark text={segment.op === "anchor" ? "" : segment.text} />;
  }

  if (segment.op === "replace") {
    return <span className="highlight-span replace-mark">{segment.text}</span>;
  }

  return <span>{segment.text}</span>;
}

function DeleteMark({ text }: { text: string }) {
  return (
    <span className="delete-mark">
      [<span className="delete-text">{text}</span>]
    </span>
  );
}

function InsertMark({ text }: { text: string }) {
  return <span className="insert-mark">{`/${text}\\`}</span>;
}

function targetLabel(target: Target): string {
  return target.type === "reference" ? `reference ${target.id}` : `candidate ${target.id}`;
}
