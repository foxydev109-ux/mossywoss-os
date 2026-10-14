# Roadmap — proposed native track (NOT YET BUILT)

Honesty first: MossyWoss OS today is a web-based OS — a complete desktop,
VFS, Store, and apps running in the browser sandbox. Everything in this file
is a PROPOSAL for a separate native track. Nothing below is implemented,
claimed, or shipped. Contributors who want to start a real kernel from this
outline are very welcome — in a new `kernel/` directory so the web OS stays
honest about what it is.

## Phase 1 — Bootstrapping & memory
- Multiboot2-compliant boot loader (hand-written assembly, no placeholder stubs)
- Physical memory manager (buddy or bitmap allocator over the memory map)
- Virtual memory: page tables, higher-half mapping, kernel heap allocator
- Automated test: boot in headless QEMU (GitHub Actions) and assert the
  memory map + alloc/free round-trips via serial output

## Phase 2 — Hardware & context
- IDT/GDT setup and interrupt handling (inline assembly, explicitly written)
- PS/2 keyboard + mouse drivers; timer (PIT/APIC)
- Preemptive multitasking scheduler (round-robin, per-CPU runqueues)
- Automated test: QEMU boots, keys inject via serial, scheduler context
  switches counted and asserted from a test runner

## Phase 3 — Target subsystems
- VFS storage layer (block devices, in-memory FS first)
- Local ZIP parser (Local File Header + central directory, raw-buffer,
  minimal allocations — the same format the web OS zip engine implements)
- PE binary parser (DOS MZ header, PE headers, section table with
  correct R/W/E permissions, import table resolution) — starting as a
  parser/analyzer; execution is a later, explicit milestone. No claim of
  running .exe files may appear anywhere until it actually runs one.
- Automated test: fixture binaries parsed in QEMU; section maps and import
  tables asserted against known-good values

Each phase lands with its own test script runnable headless in CI (QEMU via
GitHub Actions). Code is real or it does not merge.
