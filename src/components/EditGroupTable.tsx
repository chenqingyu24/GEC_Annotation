import { Fragment, type KeyboardEvent, type ReactNode } from "react";
import type {
  AlignmentCell,
  AlignmentCellPart,
  AlignmentSlot,
  AlignmentView,
  DiffView,
  EditGroup,
  EditGroupItem,
  EditGroupItemSegment,
  SegmentType,
  Target
} from "../types";
import {
  formatEditGroupLabel,
  formatTargetLabel,
  useI18n,
  type Locale
} from "../i18n";
import { DiffToken, type DiffTokenSegment } from "./DiffToken";

interface EditGroupTableProps {
  view: DiffView;
  alignmentView?: AlignmentView;
  selectedGroupId: string | null;
  onSelectGroup: (groupId: string) => void;
}

export function EditGroupTable({
  view,
  alignmentView,
  selectedGroupId,
  onSelectGroup
}: EditGroupTableProps) {
  const { locale, messages: m } = useI18n();

  if (alignmentView) {
    return (
      <AlignmentEditGroupTable
        view={view}
        alignmentView={alignmentView}
        selectedGroupId={selectedGroupId}
        onSelectGroup={onSelectGroup}
      />
    );
  }

  return (
    <section className="panel result-panel" aria-labelledby="edit-group-title">
      <div className="panel-header">
        <h2 id="edit-group-title">{m.editGroupTable}</h2>
      </div>

      <div className="table-scroll">
        <table className="edit-table">
          <thead>
            <tr>
              <th scope="col">{m.editGroup}</th>
              <th scope="col">{m.sourceFragment}</th>
              {view.targets.map((target) => (
                <th scope="col" key={target.id}>
                  {targetLabel(target, view.targets, locale)}
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
                  <span className="group-id">
                    {formatEditGroupLabel(group.group_id, locale)}
                  </span>
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

function AlignmentEditGroupTable({
  view,
  alignmentView,
  selectedGroupId,
  onSelectGroup
}: {
  view: DiffView;
  alignmentView: AlignmentView;
  selectedGroupId: string | null;
  onSelectGroup: (groupId: string) => void;
}) {
  const { locale, messages: m } = useI18n();
  const sourceLine = alignmentView.lines.find((line) => line.id === "source");
  const targetLines = view.targets
    .map((target) => alignmentView.lines.find((line) => line.id === target.id))
    .filter((line): line is AlignmentView["lines"][number] => Boolean(line));
  const tableSlots = alignmentView.slots
    .map((slot, index) => ({ slot, index }))
    .filter(({ slot }) => slot.group_id || slot.is_difference);

  if (!sourceLine) {
    return null;
  }

  return (
    <section className="panel result-panel" aria-labelledby="edit-group-title">
      <div className="panel-header">
        <h2 id="edit-group-title">{m.editGroupTable}</h2>
      </div>

      <div className="table-scroll">
        <table className="edit-table alignment-edit-table">
          <thead>
            <tr>
              <th scope="col">{m.slot}</th>
              <th scope="col">{m.sourcePosition}</th>
              <th scope="col">{m.sourceFragment}</th>
              {view.targets.map((target) => (
                <th scope="col" key={target.id}>
                  {targetLabel(target, view.targets, locale)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {tableSlots.map(({ slot, index }) => (
              <tr
                className={slot.group_id === selectedGroupId ? "is-selected" : ""}
                key={slot.slot_id}
                tabIndex={slot.group_id ? 0 : undefined}
                onClick={() => slot.group_id && onSelectGroup(slot.group_id)}
                onKeyDown={(event) =>
                  slot.group_id && handleRowKeyDown(event, slot.group_id, onSelectGroup)
                }
              >
                <th scope="row">
                  <span className="group-id">
                    {formatEditGroupLabel(slot.slot_id, locale)}
                  </span>
                  {slot.group_id && slot.slot_id !== slot.group_id ? (
                    <span className="group-range">
                      {formatEditGroupLabel(slot.group_id, locale)}
                    </span>
                  ) : null}
                </th>
                <td>{slotRange(slot)}</td>
                <td>{renderAlignmentTableCell(sourceLine.cells[index], m.emptySlotLabel)}</td>
                {targetLines.map((line) => (
                  <td key={line.id}>{renderAlignmentTableCell(line.cells[index], m.emptySlotLabel)}</td>
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

function renderAlignmentTableCell(
  cell: AlignmentCell | undefined,
  emptySlotLabel: string
): ReactNode {
  if (!cell || cell.is_empty) {
    return <span className="empty-slot-label">{emptySlotLabel}</span>;
  }

  return (
    <span className={`table-alignment-cell alignment-op-${cell.op}`}>
      {renderAlignmentTableParts(cell.parts)}
    </span>
  );
}

function renderAlignmentTableParts(parts: AlignmentCellPart[]): ReactNode {
  const prefixParts = parts.filter((part) => part.role === "prefix-punctuation");
  const coreParts = parts.filter((part) => part.role === "core");

  return (
    <>
      <span className="alignment-prefix-content">
        {prefixParts.map((part, index) => renderAlignmentTablePart(part, index))}
      </span>
      <span className="alignment-core-content">
        {coreParts.map((part, index) => renderAlignmentTablePart(part, index))}
      </span>
    </>
  );
}

function renderAlignmentTablePart(part: AlignmentCellPart, index: number): ReactNode {
  return (
    <span
      className={["alignment-part", `alignment-part-op-${part.op}`].join(" ")}
      key={`${part.role}-${index}`}
    >
      {part.text}
    </span>
  );
}

function slotRange(slot: AlignmentSlot): string {
  if (slot.source_start === slot.source_end) {
    return String(slot.source_start);
  }

  return `${slot.source_start}-${slot.source_end}`;
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

function targetLabel(target: Target, targets: Target[], locale: Locale): string {
  return formatTargetLabel(target, targets, locale);
}
