import { Fragment, type CSSProperties, type KeyboardEvent, type ReactNode } from "react";
import type {
  DiffView,
  EditGroup,
  EditGroupItem,
  EditGroupItemSegment,
  SegmentType,
  Target
} from "../types";
import { DiffToken, type DiffTokenSegment } from "./DiffToken";

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
                  <td key={target.id}>{renderItem(group.items[target.id], group)}</td>
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
  return (
    <AlignedCell sourceSlot={group.source_start}>
      <DiffToken segment={sourceSegmentForGroup(group)} lineType="source" sourceSlot={group.source_start} />
    </AlignedCell>
  );
}

function renderItem(item: EditGroupItem | undefined, group: EditGroup): ReactNode {
  if (!item) {
    return <span className="muted-text">-</span>;
  }

  if (item.op === "equal") {
    return (
      <AlignedCell sourceSlot={group.source_start}>
        <DiffToken
          segment={sourceSideSegmentForEqualItem(item, group)}
          lineType="candidate"
          sourceSlot={group.source_start}
        />
      </AlignedCell>
    );
  }

  const segments =
    item.segments.length > 0 ? item.segments : [{ text: item.text, op: item.op }];

  return (
    <AlignedCell sourceSlot={group.source_start}>
      {segments.map((segment, index) => (
        <Fragment key={`${segment.op}-${index}`}>
          {renderSegment(segment, group, index)}
        </Fragment>
      ))}
    </AlignedCell>
  );
}

function renderSegment(
  segment: EditGroupItemSegment,
  group: EditGroup,
  index: number
): ReactNode {
  if (segment.op === "equal") {
    return <span>{segment.text}</span>;
  }

  return (
    <DiffToken
      segment={itemSegmentToToken(segment, group)}
      lineType="candidate"
      sourceSlot={group.source_start + index}
    />
  );
}

function AlignedCell({
  sourceSlot,
  children
}: {
  sourceSlot: number;
  children: ReactNode;
}) {
  return (
    <span
      className="aligned-cell-content"
      data-source-slot={sourceSlot}
      style={{ "--source-slot": sourceSlot } as CSSProperties}
    >
      {children}
    </span>
  );
}

function sourceSegmentForGroup(group: EditGroup): DiffTokenSegment {
  const type = sourceTypeForGroup(group);

  return {
    text: group.source_text,
    type,
    group_id: group.group_id,
    op: type === "anchor" ? "anchor" : type === "plain" ? "equal" : type
  };
}

function sourceSideSegmentForEqualItem(
  item: EditGroupItem,
  group: EditGroup
): DiffTokenSegment {
  const type = sourceTypeForGroup(group);

  return {
    text: item.text,
    type,
    group_id: group.group_id,
    op: type === "anchor" ? "anchor" : "equal"
  };
}

function itemSegmentToToken(
  segment: EditGroupItemSegment,
  group: EditGroup
): DiffTokenSegment {
  const type: SegmentType =
    segment.op === "anchor" ? "anchor" : segment.op === "equal" ? "plain" : segment.op;

  return {
    text: segment.text,
    type,
    group_id: group.group_id,
    op: segment.op
  };
}

function sourceTypeForGroup(group: EditGroup): SegmentType {
  if (group.source_start === group.source_end) {
    return "anchor";
  }

  const ops = Object.values(group.items).flatMap((item) =>
    item.segments.length > 0 ? item.segments.map((segment) => segment.op) : [item.op]
  );

  if (ops.includes("replace")) {
    return "replace";
  }

  if (ops.includes("delete")) {
    return "delete";
  }

  return "plain";
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
