-- AlterTable
ALTER TABLE "Asset" ADD COLUMN "tag" TEXT;

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_ProjectAsset" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "projectId" TEXT NOT NULL,
    "assetId" TEXT NOT NULL,
    "role" TEXT,
    "selectedFileIds" TEXT NOT NULL DEFAULT '[]',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ProjectAsset_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ProjectAsset_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "Asset" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_ProjectAsset" ("assetId", "createdAt", "id", "projectId", "role") SELECT "assetId", "createdAt", "id", "projectId", "role" FROM "ProjectAsset";
DROP TABLE "ProjectAsset";
ALTER TABLE "new_ProjectAsset" RENAME TO "ProjectAsset";
CREATE UNIQUE INDEX "ProjectAsset_projectId_assetId_key" ON "ProjectAsset"("projectId", "assetId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
